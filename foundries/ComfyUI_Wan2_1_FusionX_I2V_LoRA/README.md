# ComfyUI_Wan2_1_FusionX_I2V_LoRA

- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/ComfyUI_Wan2_1_FusionX_I2V_LoRA>
- RunPod Template - <https://console.runpod.io/deploy?template=s3gsvfw8ju&ref=1c1r2p2a>
- Docker Hub - <https://hub.docker.com/r/ofuton/comfyui-wan2.1-fusionx-i2v-lora>

## Information

- Container Image: runpod/pytorch:2.8.0-py3.11-cuda12.8.1-cudnn-devel-ubuntu22.04
- Start Command: [start.sh](./start.sh)

## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- (Optional) Edit Template
  - Container Disk Size
  - Volume Disk Size (If you want to persist models, must be greater than 0GB)
- Deploy
- Connect to ComfyUI server (port 8188)
- Drag [workflow.json](https://raw.githubusercontent.com/ampcpmgp/mofugao-lab/refs/heads/main/foundries/ComfyUI_Wan2_1_FusionX_I2V_LoRA/workflow.json) file onto the screen.
- Execute ComfyUI

## Develop

```bash
# current version is here: https://hub.docker.com/r/ofuton/comfyui-wan2.1-fusionx-i2v-lora/tags
docker build -t ofuton/comfyui-wan2.1-fusionx-i2v-lora:<SEM_VER> -t ofuton/comfyui-wan2.1-fusionx-i2v-lora:latest .
docker images
docker push --all-tags ofuton/comfyui-wan2.1-fusionx-i2v-lora
```
