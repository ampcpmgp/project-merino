// 許可パス管理（filesystem.ts の補助）
// 環境変数で上書き可能

export interface PathConfig {
  roots: {
    private: string
    public: string
    data: string
    scripts: string
  }
  readonlyRoots: string[]
}

export const DEFAULT_PATH_CONFIG: PathConfig = {
  roots: {
    private: '/workspace/private',
    public: '/workspace/public',
    data: '/workspace/private/htmx-data',
    scripts: '/workspace/private/htmx-app/scripts',
  },
  readonlyRoots: [
    '/home/appuser/app',
    '/home/appuser/brain',
  ],
}

export function getPathConfig(): PathConfig {
  return {
    roots: {
      private: process.env.HTMX_PRIVATE_ROOT || DEFAULT_PATH_CONFIG.roots.private,
      public: process.env.HTMX_PUBLIC_ROOT || DEFAULT_PATH_CONFIG.roots.public,
      data: process.env.HTMX_DATA_ROOT || DEFAULT_PATH_CONFIG.roots.data,
      scripts: process.env.HTMX_SCRIPTS_DIR || DEFAULT_PATH_CONFIG.roots.scripts,
    },
    readonlyRoots: DEFAULT_PATH_CONFIG.readonlyRoots,
  }
}
