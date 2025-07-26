#!/bin/bash
CONFIG_FILE="/home/appuser/.config/code-server/config.yaml"

echo "Waiting for VS Code config file..."

while [ ! -f "$CONFIG_FILE" ]; do
  sleep 1
done

echo "---------- VSCode Password ----------"
cat "$CONFIG_FILE"
