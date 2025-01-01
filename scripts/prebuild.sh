#!/bin/bash

set -e

CURRENT_DIR=$(pwd)
cd "$(dirname "$0")/../prebuilds"

for file in *.gz; do
  gunzip -f "$file"
done

echo "Unpacking prebuilds..."

for i in 93 108 115 127; do
  echo $i
  for tarfile in *"$i"*.tar; do
    echo $tarfile
    tar -xf $tarfile
    ls ./build/Release/webgl.node
    mv -f ./build/Release/webgl.node ./linux-x64/node.abi$i.node
  done
done

rm -rf ./build
rm ./*.tar

cd "$CURRENT_DIR"