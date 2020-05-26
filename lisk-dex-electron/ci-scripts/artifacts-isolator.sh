#!/bin/bash
# Script to move all zipped/distribution files to artifacts
cd dist && mkdir -p artifacts || exit && \
# shellcheck disable=SC1073
find . -type f -maxdepth 1 -print0 | while IFS= read -r -d '' artifact; do
    mv "$artifact" "$PWD/artifacts/"
done
