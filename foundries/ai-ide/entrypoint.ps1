wsl --list --online
wsl --list --verbose

$url = "https://cloud-images.ubuntu.com/wsl/releases/noble/current/ubuntu-noble-wsl-amd64-wsl.rootfs.tar.gz"
$outputFile = "C:\wsl_images\ubuntu-24.04.tar.gz"
$imageDir = "C:\wsl_images\Ubuntu-24.04-ai-ide"
$distroName = "Ubuntu-24.04-ai-ide"

if (-not (Test-Path $outputFile)) {
  New-Item -ItemType Directory -Path (Split-Path $outputFile -Parent) -ErrorAction SilentlyContinue
  
  Write-Host "Downloading Ubuntu 24.04 image..."
  Invoke-WebRequest -Uri $url -OutFile $outputFile
  Write-Host "Download complete."
}
else {
  Write-Host "Image file already exists. Skipping download."
}

Write-Host "Importing $distroName..."
wsl --import $distroName $imageDir $outputFile
Write-Host "Import complete."

wsl -d $distroName -u root -- ./foundries/ai-ide/entrypoint.sh
