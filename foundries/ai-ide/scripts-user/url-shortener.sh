#!/usr/bin/env bash
D=/workspace/url-shortcuts
case $1 in
  add)    echo "$3" > "$D/$2" ;;
  remove) rm "$D/$2" ;;
  list)   for f in "$D"/*; do echo "/s/$(basename "$f") -> $(cat "$f")"; done ;;
esac
