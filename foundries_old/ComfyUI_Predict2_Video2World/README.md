# ComfyUI_Predict2_Video2World

- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/ComfyUI_Predict2_Video2World>
- RunPod Template - <https://console.runpod.io/deploy?template=wc2pvrl5kr&ref=1c1r2p2a>
- Docker Hub - <https://hub.docker.com/r/ofuton/comfyui-predict2-video2world>


## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- (Optional) Edit Template
  - Container Disk Size
  - Volume Disk Size (If you want to use only temporary storage, set it to 0GB)
- Deploy
- See logs, wait to start ComfyUI server
- Connect to ComfyUI server (port 8188)
- Drag [workflow.json](https://raw.githubusercontent.com/ampcpmgp/mofugao-lab/refs/heads/main/foundries/ComfyUI_Predict2_Video2World/workflow.json) file onto the screen.
- Start to develop

## Develop

```bash
# current version is here: https://hub.docker.com/r/ofuton/comfyui-predict2-video2world/tags
docker build -t ofuton/comfyui-predict2-video2world:<SEM_VER> -t ofuton/comfyui-predict2-video2world:latest .
docker images
docker push --all-tags ofuton/comfyui-predict2-video2world
```
