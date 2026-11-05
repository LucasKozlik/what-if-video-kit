#!/usr/bin/env bash
# Render the film in N parallel segments (software WebGL is the bottleneck), then join them.
#   bash tools/export-parallel.sh [jobs=4] [fps=30]
set -e
cd "$(dirname "$0")/.."
J=${1:-4}; FPS=${2:-30}; D=61
pids=()
for ((k=0; k<J; k++)); do
  a=$(python3 -c "print($D*$k/$J)"); b=$(python3 -c "print($D*($k+1)/$J)")
  node tools/export.mjs --cpu --fps=$FPS --from=$a --to=$b --frames=tools/frames_$k --out=tools/out/seg_$k.mp4 > tools/out/seg_$k.log 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
: > tools/out/segs.txt
for ((k=0; k<J; k++)); do echo "file 'seg_$k.mp4'" >> tools/out/segs.txt; done
ffmpeg -loglevel error -y -f concat -safe 0 -i tools/out/segs.txt -c copy tools/out/video_silent.mp4
echo "joined -> tools/out/video_silent.mp4"
