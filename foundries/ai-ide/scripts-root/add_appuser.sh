#!/bin/bash

USERNAME="appuser"

if id "$USERNAME" &>/dev/null; then
  echo "ℹ️ $USERNAME already exists."
else
  echo "ℹ️ Creating user $USERNAME..."
  useradd -m -s /bin/bash "$USERNAME"
  echo "✅ $USERNAME has been created."
fi
