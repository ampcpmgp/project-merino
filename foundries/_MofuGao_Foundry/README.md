# _MofuGao_Foundry

- Source - <https://github.com/ampcpmgp/mofugao-lab/tree/main/foundries/_MofuGao_Foundry>
- Docker Hub - <https://hub.docker.com/r/ofuton/mofugao-foundry>

## Preparation

- (Option) SSH Key setup - https://docs.runpod.io/pods/configuration/use-ssh

## How to use on RunPod

- Select CUDA Versions 12.8 or higher
- RTX 4090 or higher
- (Optional) Edit Template
  - Container Disk Size
  - Volume Disk Size (If you want to use only temporary storage, set it to 0GB)
- Deploy
- Connect to ComfyUI server (port 8100)
- Connect to VSCode server (port 8200)

## Develop

```bash
docker builder prune --filter "until=168h"
# current version is here: https://hub.docker.com/r/ofuton/mofugao-foundry/tags
time docker build -t ofuton/mofugao-foundry:0.0.1 -t ofuton/mofugao-foundry:latest .
docker images
docker run --rm --gpus all ofuton/mofugao-foundry:latest
docker push --all-tags ofuton/mofugao-foundry
```
