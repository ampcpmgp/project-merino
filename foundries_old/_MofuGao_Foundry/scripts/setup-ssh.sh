#!/bin/bash
if [ -n "$PUBLIC_KEY" ]; then
  echo "SSH setup..."
  mkdir -p ~/.ssh
  grep -qF "$PUBLIC_KEY" ~/.ssh/authorized_keys || echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  echo "SSH setup complete."
else
  echo "SSH key not provided, skipping SSH setup."
fi

if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
  echo "Generating new SSH host keys..."
  ssh-keygen -A
  echo "Host keys generated."
fi
