# ComfyUI_Wan2_1_FusionX_I2V_Native


- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/ComfyUI_Wan2_1_FusionX_I2V_Native>
- RunPod Template - <https://console.runpod.io/deploy?template=4pk1zal9vb&ref=1c1r2p2a>
- Docker Hub - <https://hub.docker.com/r/ofuton/comfyui-wan2.1-fusionx-i2v-native>

## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- (Optional) Edit Template
  - Container Disk Size
  - Volume Disk Size (If you want to persist models, must be greater than 0GB)
- Deploy
- See logs, wait to start ComfyUI server
- Connect to ComfyUI server (port 8188)
- Drag [workflow.json](https://raw.githubusercontent.com/ampcpmgp/mofugao-lab/refs/heads/main/foundries/ComfyUI_Wan2_1_FusionX_I2V_Native/workflow.json) file onto the screen.
- Execute ComfyUI

## Develop

```bash
# current version is here: https://hub.docker.com/r/ofuton/comfyui-wan2.1-fusionx-i2v-native/tags
docker build -t ofuton/comfyui-wan2.1-fusionx-i2v-native:<SEM_VER> -t ofuton/comfyui-wan2.1-fusionx-i2v-native:latest .
docker images
docker push --all-tags ofuton/comfyui-wan2.1-fusionx-i2v-native
```
