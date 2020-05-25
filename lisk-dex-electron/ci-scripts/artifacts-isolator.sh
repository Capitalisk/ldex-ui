#!/bin/bash
cd dist && mkdir -p compressed || exit && \
zipped_artifatcts=$(find . -name "*.zip")
for artifact in $zipped_artifatcts
do
  mv "$artifact" "$PWD/compressed/"
done
