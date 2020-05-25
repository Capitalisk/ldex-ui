#!/bin/bash
cd dist && mkdir -p compressed || exit && \
zipped_artifatcts=$(find . -type f -maxdepth 1)
for artifact in $zipped_artifatcts
do
  mv "$artifact" "$PWD/artifacts/"
done
