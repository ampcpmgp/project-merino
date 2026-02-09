/**
 * Merino Memo - メモ管理用ポップアップツール
 * 
 * このファイルは、ダイアログの適切な管理とESCキーハンドリングを実装しています。
 * 新しいダイアログを追加する場合も、既存のパターンに従って実装してください。
 */

// グローバル状態管理
const AppState = {
    dialogStack: [], // ダイアログスタック（開いている順序を管理）
    memoData: {
        text: '',
        fontSize: 'medium',
        autoSave: false,
        variables: []
    }
};

// ダイアログ管理クラス
class DialogManager {
    constructor() {
        this.dialogs = new Map();
        this.setupGlobalESCHandler();
    }

    /**
     * ダイアログを登録
     * @param {string} id - ダイアログID
     * @param {HTMLElement} element - ダイアログ要素
     */
    register(id, element) {
        this.dialogs.set(id, element);
    }

    /**
     * ダイアログを開く
     * @param {string} id - ダイアログID
     */
    open(id) {
        const dialog = this.dialogs.get(id);
        if (!dialog) {
            console.error(`Dialog ${id} not found`);
            return;
        }

        dialog.style.display = 'flex';
        dialog.classList.remove('closing');
        AppState.dialogStack.push(id);
        
        // 最初のフォーカス可能な要素にフォーカス
        this.focusFirstElement(dialog);
    }

    /**
     * ダイアログを閉じる
     * @param {string} id - ダイアログID（省略時は最後に開いたダイアログ）
     */
    close(id = null) {
        const dialogId = id || this.getTopDialog();
        if (!dialogId) return;

        const dialog = this.dialogs.get(dialogId);
        if (!dialog) return;

        // アニメーション付きで閉じる
        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.style.display = 'none';
            dialog.classList.remove('closing');
        }, 200);

        // スタックから削除
        const index = AppState.dialogStack.indexOf(dialogId);
        if (index > -1) {
            AppState.dialogStack.splice(index, 1);
        }
    }

    /**
     * すべてのダイアログを閉じる
     */
    closeAll() {
        while (AppState.dialogStack.length > 0) {
            this.close();
        }
    }

    /**
     * 最上位のダイアログIDを取得
     */
    getTopDialog() {
        return AppState.dialogStack[AppState.dialogStack.length - 1];
    }

    /**
     * ダイアログが開いているか確認
     */
    hasOpenDialogs() {
        return AppState.dialogStack.length > 0;
    }

    /**
     * グローバルESCキーハンドラーをセットアップ
     * ダイアログを一つずつ確実に閉じる
     */
    setupGlobalESCHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // ダイアログが開いている場合、最上位のダイアログを閉じる
                if (this.hasOpenDialogs()) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                }
            }
        });
    }

    /**
     * ダイアログ内の最初のフォーカス可能な要素にフォーカス
     */
    focusFirstElement(dialog) {
        const focusable = dialog.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }
}

// ユーティリティ関数
const Utils = {
    /**
     * トースト通知を表示
     * @param {string} message - メッセージ
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    /**
     * ローカルストレージからデータを読み込み
     */
    async loadData() {
        try {
            const result = await chrome.storage.local.get('memoData');
            if (result.memoData) {
                AppState.memoData = { ...AppState.memoData, ...result.memoData };
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    },

    /**
     * ローカルストレージにデータを保存
     */
    async saveData() {
        try {
            await chrome.storage.local.set({ memoData: AppState.memoData });
            this.showToast('保存しました');
        } catch (error) {
            console.error('Failed to save data:', error);
            this.showToast('保存に失敗しました');
        }
    }
};

// アプリケーション初期化
class MemoApp {
    constructor() {
        this.dialogManager = new DialogManager();
        this.init();
    }

    async init() {
        // データ読み込み
        await Utils.loadData();

        // ダイアログを登録
        this.dialogManager.register('settings-dialog', document.getElementById('settings-dialog'));
        this.dialogManager.register('variables-dialog', document.getElementById('variables-dialog'));

        // イベントリスナーをセットアップ
        this.setupEventListeners();

        // UIを初期化
        this.updateUI();
    }

    setupEventListeners() {
        // メモテキストの変更
        const memoText = document.getElementById('memo-text');
        memoText.addEventListener('input', () => {
            AppState.memoData.text = memoText.value;
            if (AppState.memoData.autoSave) {
                Utils.saveData();
            }
        });

        // 保存ボタン
        document.getElementById('save-btn').addEventListener('click', () => {
            AppState.memoData.text = memoText.value;
            Utils.saveData();
        });

        // クリアボタン
        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('メモをクリアしますか？')) {
                memoText.value = '';
                AppState.memoData.text = '';
                Utils.saveData();
            }
        });

        // 設定ボタン
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.dialogManager.open('settings-dialog');
        });

        // 設定ダイアログ - 閉じるボタン
        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.saveSettings();
            this.dialogManager.close('settings-dialog');
        });

        // 変数設定ボタン
        document.getElementById('variables-btn').addEventListener('click', () => {
            this.dialogManager.open('variables-dialog');
            this.renderVariables();
        });

        // 変数設定ダイアログ - 閉じるボタン
        document.getElementById('close-variables-btn').addEventListener('click', () => {
            this.saveVariables();
            this.dialogManager.close('variables-dialog');
        });

        // 変数追加ボタン
        document.getElementById('add-variable-btn').addEventListener('click', () => {
            this.addVariable();
        });

        // すべての閉じるボタン（×ボタン）
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dialogId = e.target.getAttribute('data-dialog');
                if (dialogId === 'settings-dialog') {
                    this.saveSettings();
                } else if (dialogId === 'variables-dialog') {
                    this.saveVariables();
                }
                this.dialogManager.close(dialogId);
            });
        });

        // フォントサイズ変更
        document.getElementById('font-size').addEventListener('change', (e) => {
            this.changeFontSize(e.target.value);
        });
    }

    updateUI() {
        // メモテキストを復元
        document.getElementById('memo-text').value = AppState.memoData.text;

        // フォントサイズを適用
        this.changeFontSize(AppState.memoData.fontSize);
        document.getElementById('font-size').value = AppState.memoData.fontSize;

        // 自動保存設定
        document.getElementById('auto-save').checked = AppState.memoData.autoSave;
    }

    changeFontSize(size) {
        const memoText = document.getElementById('memo-text');
        memoText.className = `font-${size}`;
        AppState.memoData.fontSize = size;
    }

    saveSettings() {
        AppState.memoData.fontSize = document.getElementById('font-size').value;
        AppState.memoData.autoSave = document.getElementById('auto-save').checked;
        Utils.saveData();
    }

    renderVariables() {
        const container = document.getElementById('variables-list');
        container.innerHTML = '';

        if (AppState.memoData.variables.length === 0) {
            container.innerHTML = '<p style="color: #999;">変数がありません</p>';
            return;
        }

        AppState.memoData.variables.forEach((variable, index) => {
            const item = document.createElement('div');
            item.className = 'variable-item';
            item.innerHTML = `
                <input type="text" placeholder="変数名" value="${variable.name || ''}" data-index="${index}" data-field="name">
                <input type="text" placeholder="値" value="${variable.value || ''}" data-index="${index}" data-field="value">
                <button onclick="app.removeVariable(${index})">削除</button>
            `;
            container.appendChild(item);
        });

        // 入力イベントを設定
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                AppState.memoData.variables[index][field] = e.target.value;
            });
        });
    }

    addVariable() {
        AppState.memoData.variables.push({ name: '', value: '' });
        this.renderVariables();
    }

    removeVariable(index) {
        if (confirm('この変数を削除しますか？')) {
            AppState.memoData.variables.splice(index, 1);
            this.renderVariables();
        }
    }

    saveVariables() {
        Utils.saveData();
    }
}

// アプリケーション起動
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new MemoApp();
});
