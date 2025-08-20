# n8n

## Local Development with WSL

- CloudFlare Tunnel をセットアップします。
- `foundries/n8n/.env.example` をコピーして `.env` を作成、上記で設定した内容を反映します。

以下を powershell で実行する

```powershell
# show available WSL distributions
wsl --list --online

# Show installed WSL distributions
wsl --list --verbose

# Download and Start WSL with Ubuntu 24.04
# Input `appuser` as username and secure password when prompted
wsl --install Ubuntu-24.04 --name Ubuntu-24.04-n8n

# ルート権限になってから実行
sudo -s
./foundries/n8n/entrypoint.sh
```

開発終了後、 cleanup するため powershell から以下を実行し削除します。

```powershell
wsl --terminate Ubuntu-24.04-n8n
wsl --unregister Ubuntu-24.04-n8n
```

開発終了後に停止のみ行い、再度 WSL を起動する場合は powershell から以下を実行します。ただし、不安定になるため非推奨です。

```powershell
wsl --terminate Ubuntu-24.04-n8n
wsl --distribution Ubuntu-24.04-n8n --user root
```
