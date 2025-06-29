# ComfyUI_Wan

- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/ComfyUI_Wan>
- RunPod Template - <https://console.runpod.io/deploy?template=ytr47drnpf&ref=1c1r2p2a>
- Docker Hub - <https://hub.docker.com/r/ofuton/comfyui-wan>

## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- (Optional) Edit Template
  - Container Disk Size
  - Volume Disk Size (If you want to persist models, must be greater than 0GB)
- Deploy
- Connect to ComfyUI server (port 8188)

## Develop

```bash
# current version is here: https://hub.docker.com/r/ofuton/comfyui-wan/tags
docker build -t ofuton/comfyui-wan:<SEM_VER> -t ofuton/comfyui-wan:latest .
docker images
docker push --all-tags ofuton/comfyui-wan
```
