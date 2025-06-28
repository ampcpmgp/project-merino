#!/bin/bash

trap 'kill 0' SIGTERM

echo "process background starting..."
python3 main.py --listen &
python3 -m http.server 9000 &

echo "process background started."
wait
