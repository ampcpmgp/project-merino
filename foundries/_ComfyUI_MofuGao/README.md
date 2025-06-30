# _ComfyUI_MofuGao

- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/_ComfyUI_MofuGao>
- Docker Hub - <https://hub.docker.com/r/ofuton/comfyui-mofugao>

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
# current version is here: https://hub.docker.com/r/ofuton/comfyui-mofugao/tags
docker build -t ofuton/comfyui-mofugao:<SEM_VER> -t ofuton/comfyui-mofugao:latest .
docker images
docker push --all-tags ofuton/comfyui-mofugao
```
