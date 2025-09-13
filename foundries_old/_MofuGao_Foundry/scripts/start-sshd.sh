#!/bin/bash
/usr/local/bin/setup-ssh.sh

echo "Starting sshd..."
exec /usr/sbin/sshd -D
