#!/bin/bash
cd ../dist && mkdir -p compressed || exit && \
entries=$(ls -d lisk-dex-*)
for entry in $entries
do
  zip -r "$PWD/compressed/""$entry".zip $entry
done
