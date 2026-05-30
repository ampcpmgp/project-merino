import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as uuid from 'uuid';
import '@excalidraw/excalidraw/index.css';
import { SidePanel } from './components/SidePanel';

const globalStyle = `
  html,
  body,
  #root{
    margin:0;
    padding:0;
    width:100%;
    height:100%;
    overflow:hidden;
    position:fixed;
  }
`;

const PANEL_CONTENT_WIDTH = 280;
const TOGGLE_BUTTON_WIDTH = 32;
const PANEL_WIDTH_OPEN = PANEL_CONTENT_WIDTH + TOGGLE_BUTTON_WIDTH;
const PANEL_WIDTH_CLOSED = TOGGLE_BUTTON_WIDTH;

// UUID v5 名前空間（固定値）
const ROOM_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// localStorage keys
const LS_KEY_UI = 'wb-ui';                    // 全体共通：テーマ、背景色
const LS_KEY_ROOM = (room) => `wb-room-${room}`; // ルームごと：座標、ズーム

// Load helpers
const loadUI = () => {
  const saved = localStorage.getItem(LS_KEY_UI);
  return saved ? JSON.parse(saved) : { theme: 'light', viewBackgroundColor: '#ffffff' };
};

const loadRoomState = (room) => {
  const saved = localStorage.getItem(LS_KEY_ROOM(room));
  return saved ? JSON.parse(saved) : null;
};

// Save helper（debounced）
const debouncedSave = (() => {
  let timeouts = {};
  return (key, data, delay = 300) => {
    clearTimeout(timeouts[key]);
    timeouts[key] = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(data));
    }, delay);
  };
})();

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

function App() {
  const [api, setApi] = useState(null);
  const yMapRef = useRef(null);
  const yFilesMapRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const [theme, setTheme] = useState('light');
  const isRemoteUpdating = useRef(false);
  const savedCameraRef = useRef(null);
  const hasRestoredCamera = useRef(false);

  // 人間可読な部屋名を取得（URLクエリパラメータから）
  const getRoomName = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'default';
  };

  // 部屋名をUUID v5に変換（ストレージ用）
  const getStorageId = (roomName) => {
    return uuid.v5(roomName, ROOM_NAMESPACE);
  };

  // Hocuspocus接続（リアルタイム同期用）
  useEffect(() => {
    const ydoc = new Y.Doc();
    const map = ydoc.getMap('elements');
    const filesMap = ydoc.getMap('files');
    const room = getRoomName();

    // IndexedDB 永続化（オフライン対応）
    const persistence = new IndexeddbPersistence(room, ydoc);

    const wsUrl = import.meta.env.DEV
      ? "ws://localhost:3102"
      : `wss://${window.location.host}/socket`

    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: room,
      document: ydoc,
      onSynced: () => {
        yMapRef.current = map;
        yFilesMapRef.current = filesMap;

        const loadedElements = cloneElements(map);
        const loadedFiles = Object.fromEntries(filesMap.entries());

        // 保存された設定を読み込み
        const ui = loadUI();
        const roomState = loadRoomState(room);
        savedCameraRef.current = roomState;
        setTheme(ui.theme);

        // ExcalidrawのinitialDataとして設定
        setInitialData({
          elements: loadedElements,
          files: loadedFiles,
          appState: {
            theme: ui.theme,
            viewBackgroundColor: ui.viewBackgroundColor,
            scrollX: roomState?.scrollX ?? 0,
            scrollY: roomState?.scrollY ?? 0,
            zoom: roomState?.zoom ?? { value: 1 },
          },
        });

        setIsLoading(false);
      }
    });

    const handleMapChange = (event) => {
      if (!api || event.transaction.origin === 'local') return;
      isRemoteUpdating.current = true;
      api.updateScene({ elements: cloneElements(map), commitToHistory: false });
      setTimeout(() => (isRemoteUpdating.current = false), 50);
    };

    const handleFilesChange = (event) => {
      if (!api || event.transaction.origin === 'local') return;
      const files = Object.fromEntries(filesMap.entries());
      const filesArray = Object.values(files);

      // リモートからの画像データを追加して表示
      if (filesArray.length > 0) {
        api.addFiles(filesArray);
      }
      api.updateScene({ files, commitToHistory: false });
    };

    map.observe(handleMapChange);
    filesMap.observe(handleFilesChange);

    return () => {
      map.unobserve(handleMapChange);
      filesMap.unobserve(handleFilesChange);
      provider.destroy();
      persistence.destroy();
      ydoc.destroy();
    };
  }, [api]);



  const onChange = (elements, appState, changedFiles) => {
    setElements(elements);

    // テーマ変更を反映
    if (appState.theme !== theme) {
      setTheme(appState.theme);
    }

    // 設定を保存（debounced）
    debouncedSave(LS_KEY_UI, {
      theme: appState.theme,
      viewBackgroundColor: appState.viewBackgroundColor,
    }, 300);

    // ルーム状態を保存（debounced）
    debouncedSave(LS_KEY_ROOM(getRoomName()), {
      scrollX: appState.scrollX,
      scrollY: appState.scrollY,
      zoom: appState.zoom,
    }, 300);

    if (!yMapRef.current || isRemoteUpdating.current) return;

    // elementsを同期
    yMapRef.current.doc.transact(() => {
      elements.forEach((el) => {
        const prev = yMapRef.current.get(el.id);
        const shouldUpdate = !el.isDeleted && (!prev || prev.version !== el.version);
        const shouldDelete = el.isDeleted && yMapRef.current.has(el.id);
        if (shouldUpdate) yMapRef.current.set(el.id, { ...el });
        if (shouldDelete) yMapRef.current.delete(el.id);
      });
    }, 'local');

    // 画像データ（files）を同期
    if (!yFilesMapRef.current || !changedFiles) return;

    const newFiles = Object.entries(changedFiles).filter(([id]) => !yFilesMapRef.current.has(id));
    if (newFiles.length === 0) return;

    yFilesMapRef.current.doc.transact(() => {
      newFiles.forEach(([id, file]) => yFilesMapRef.current.set(id, file));
    }, 'local');
  };

  // Yjsマップを更新する関数（履歴読み込み時などに使用）
  const updateYMap = (newElements, newFiles = {}) => {
    if (!yMapRef.current) return;

    yMapRef.current.doc.transact(() => {
      yMapRef.current.clear();
      newElements.forEach((el) => {
        if (!el.isDeleted) {
          yMapRef.current.set(el.id, { ...el });
        }
      });
    }, 'local');

    if (yFilesMapRef.current) {
      yFilesMapRef.current.doc.transact(() => {
        yFilesMapRef.current.clear();
        Object.entries(newFiles).forEach(([id, file]) => {
          yFilesMapRef.current.set(id, file);
        });
      }, 'local');
    }
  };

  // API準備後に1回だけカメラ位置を復元
  useEffect(() => {
    if (!api || hasRestoredCamera.current) return;
    const roomState = savedCameraRef.current;
    if (roomState) {
      api.updateScene({
        appState: {
          scrollX: roomState.scrollX,
          scrollY: roomState.scrollY,
          zoom: roomState.zoom,
        },
        commitToHistory: false,
      });
    }
    hasRestoredCamera.current = true;
  }, [api]);

  // ローディング中は何も表示しない
  if (isLoading) {
    return (
      <>
        <style>{globalStyle}</style>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div>Loading...</div>
        </div>
      </>
    );
  }

  const sidePanelWidth = isPanelOpen ? PANEL_WIDTH_OPEN : PANEL_WIDTH_CLOSED;

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{
        display: 'flex',
        width: '100%',
        height: '100%',
      }}>
        <div style={{
          flex: 1,
          height: '100%',
          marginRight: `${sidePanelWidth}px`,
          transition: 'margin-right 0.2s ease-out',
        }}>
          <Excalidraw
            excalidrawAPI={setApi}
            onChange={onChange}
            initialData={initialData}
            onLinkOpen={(element, event) => {
              event.preventDefault();
              window.open(element.link, '_blank', 'noopener,noreferrer');
            }}
          />
        </div>
        <SidePanel
          isOpen={isPanelOpen}
          onToggle={() => setIsPanelOpen(!isPanelOpen)}
          roomId={getStorageId(getRoomName())}
          elements={elements}
          onLoad={(loadedElements, loadedFiles) => {
            api?.updateScene({ elements: loadedElements, files: loadedFiles });
            updateYMap(loadedElements, loadedFiles);
          }}
        />
      </div>
    </>
  );
}

function cloneElements(map) {
  return Array.from(map.values()).map((el) => ({ ...el }));
}
