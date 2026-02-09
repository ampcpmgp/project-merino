/**
 * Merino Memo - Test Version (without Chrome API)
 * メモ管理用ポップアップツール
 */

// グローバル状態管理
const AppState = {
    dialogStack: [],
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

    register(id, element) {
        this.dialogs.set(id, element);
    }

    open(id) {
        const dialog = this.dialogs.get(id);
        if (!dialog) {
            console.error(`Dialog ${id} not found`);
            return;
        }

        dialog.style.display = 'flex';
        dialog.classList.remove('closing');
        AppState.dialogStack.push(id);
        
        console.log(`✅ Opened dialog: ${id}`);
        console.log(`📚 Dialog stack:`, AppState.dialogStack);
        
        this.focusFirstElement(dialog);
    }

    close(id = null) {
        const dialogId = id || this.getTopDialog();
        if (!dialogId) return;

        const dialog = this.dialogs.get(dialogId);
        if (!dialog) return;

        dialog.classList.add('closing');
        setTimeout(() => {
            dialog.style.display = 'none';
            dialog.classList.remove('closing');
        }, 200);

        const index = AppState.dialogStack.indexOf(dialogId);
        if (index > -1) {
            AppState.dialogStack.splice(index, 1);
        }
        
        console.log(`❌ Closed dialog: ${dialogId}`);
        console.log(`📚 Dialog stack:`, AppState.dialogStack);
    }

    closeAll() {
        while (AppState.dialogStack.length > 0) {
            this.close();
        }
    }

    getTopDialog() {
        return AppState.dialogStack[AppState.dialogStack.length - 1];
    }

    hasOpenDialogs() {
        return AppState.dialogStack.length > 0;
    }

    setupGlobalESCHandler() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.hasOpenDialogs()) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const closingDialog = this.getTopDialog();
                    console.log(`🔑 ESC pressed - will close: ${closingDialog}`);
                    
                    this.close();
                }
            }
        });
        
        console.log('🎯 Global ESC handler initialized');
    }

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
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    async loadData() {
        try {
            const data = localStorage.getItem('memoData');
            if (data) {
                AppState.memoData = { ...AppState.memoData, ...JSON.parse(data) };
                console.log('📥 Loaded data from localStorage');
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    },

    async saveData() {
        try {
            localStorage.setItem('memoData', JSON.stringify(AppState.memoData));
            this.showToast('保存しました');
            console.log('💾 Saved data to localStorage');
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
        console.log('🚀 Initializing Merino Memo (Test Mode)');
        
        await Utils.loadData();

        this.dialogManager.register('settings-dialog', document.getElementById('settings-dialog'));
        this.dialogManager.register('variables-dialog', document.getElementById('variables-dialog'));

        this.setupEventListeners();
        this.updateUI();
        
        console.log('✨ Initialization complete');
    }

    setupEventListeners() {
        const memoText = document.getElementById('memo-text');
        memoText.addEventListener('input', () => {
            AppState.memoData.text = memoText.value;
            if (AppState.memoData.autoSave) {
                Utils.saveData();
            }
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            AppState.memoData.text = memoText.value;
            Utils.saveData();
        });

        document.getElementById('clear-btn').addEventListener('click', () => {
            if (confirm('メモをクリアしますか？')) {
                memoText.value = '';
                AppState.memoData.text = '';
                Utils.saveData();
            }
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.dialogManager.open('settings-dialog');
        });

        document.getElementById('close-settings-btn').addEventListener('click', () => {
            this.saveSettings();
            this.dialogManager.close('settings-dialog');
        });

        document.getElementById('variables-btn').addEventListener('click', () => {
            this.dialogManager.open('variables-dialog');
            this.renderVariables();
        });

        document.getElementById('close-variables-btn').addEventListener('click', () => {
            this.saveVariables();
            this.dialogManager.close('variables-dialog');
        });

        document.getElementById('add-variable-btn').addEventListener('click', () => {
            this.addVariable();
        });

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

        document.getElementById('font-size').addEventListener('change', (e) => {
            this.changeFontSize(e.target.value);
        });
    }

    updateUI() {
        document.getElementById('memo-text').value = AppState.memoData.text;
        this.changeFontSize(AppState.memoData.fontSize);
        document.getElementById('font-size').value = AppState.memoData.fontSize;
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
