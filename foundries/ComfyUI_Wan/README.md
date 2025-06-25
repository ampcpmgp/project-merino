# ComfyUI - Wan

- RunPod Template - <https://console.runpod.io/deploy?template=ytr47drnpf&ref=1c1r2p2a>

## Information

- Container Image: runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04
- Start Command: [start.sh](./start.sh)

## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- set env GITHUB_ACCESS_TOKEN from <https://github.com/settings/personal-access-tokens>
- Deploy
- See logs, wait to start a server
- Connect to ComfyUI server (port 8188)
- Start to develop

## Additional Information

### Install Sage Attention 2

```bash
cd /workspaces
git clone https://github.com/thu-ml/SageAttention.git
cd SageAttention
python setup.py install
```
