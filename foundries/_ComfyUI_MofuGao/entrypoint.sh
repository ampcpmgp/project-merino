#!/bin/bash

trap 'kill 0' SIGTERM

echo "process background starting..."
python main.py --listen &
python -m http.server 9000 &

echo "process background started."
wait
