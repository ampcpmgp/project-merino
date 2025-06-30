# ComfyUI_Wan2_1_FusionX_VACE

- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/ComfyUI_Wan2_1_FusionX_VACE>
- RunPod Template - <https://console.runpod.io/deploy?template=zgi0pp91xx&ref=1c1r2p2a>
- Docker Hub - <https://hub.docker.com/r/ofuton/comfyui-wan2.1-fusionx-vace>

## Information

- Container Image: runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04
- Start Command: [start.sh](./start.sh)

## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- (Optional) Edit Template
  - Container Disk Size
  - Volume Disk Size (If you want to use only temporary storage, set it to 0GB)
- set env CIVITAI_API_KEY from <https://civitai.com/user/account>
- Deploy
- See logs, wait to start ComfyUI server
- Connect to ComfyUI server (port 8188)
- Drag [workflow.json](https://raw.githubusercontent.com/ampcpmgp/mofugao-lab/refs/heads/main/foundries/ComfyUI_Wan2_1_FusionX_VACE/workflow.json) file onto the screen.
- Uploade video
- Execute ComfyUI

## Develop

```bash
# current version is here: https://hub.docker.com/r/ofuton/comfyui-wan2.1-fusionx-vace/tags
docker build -t ofuton/comfyui-wan2.1-fusionx-vace:<SEM_VER> -t ofuton/comfyui-wan2.1-fusionx-vace:latest .
docker images
docker push --all-tags ofuton/comfyui-wan2.1-fusionx-vace
```

