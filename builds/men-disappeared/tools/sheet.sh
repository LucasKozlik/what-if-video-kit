#!/bin/bash
# usage: sheet.sh out.png in1.png in2.png ...  -> side-by-side at 360px wide each
out=$1; shift; args=(); f=""; i=0
for x in "$@"; do args+=(-i "$x"); f+="[$i:v]scale=360:-1[v$i];"; i=$((i+1)); done
s=""; for ((k=0;k<i;k++)); do s+="[v$k]"; done
ffmpeg -loglevel error -y "${args[@]}" -filter_complex "${f}${s}hstack=inputs=$i" "$out"
