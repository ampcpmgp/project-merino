# GPTSoVits

## Docker Build

<https://github.com/RVC-Boss/GPT-SoVITS/blob/main/docs/ja/README.md>

```shell
cd foundries/GPTSoVits

docker build -t ofuton/gpt-sovits:$(cat VERSION) -t ofuton/gpt-sovits:latest .
```

## Docker Run

```shell
docker run -it --rm --gpus all --name gpt-sovits \
  -v "/mnt/d/workspace/GPT-SoVITS:/workspace/" \
  -p 9871:9871 \
  -p 9872:9872 \
  -p 9873:9873 \
  -p 9874:9874 \
  -p 9880:9880 \
  ofuton/gpt-sovits:latest
```

## Docker exec

```shell
docker exec -it gpt-sovits /bin/bash
```

## Docker Hub Deploy

```shell
docker push ofuton/gpt-sovits:latest
```
