#!/bin/bash

set -eo pipefail

# Inspect binary.
if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
    source ~/.nvm/nvm.sh
else
    source ~/.bashrc
fi

COMMIT_MESSAGE=$(git show -s --format=%B $TRAVIS_COMMIT | tr -d '\n')
PACKAGE_JSON_VERSION=$(node -e "console.log(require('./package.json').version)")

if [[ ${COMMIT_MESSAGE} == v${PACKAGE_JSON_VERSION} ]]; then
  echo "running prebuild"
  nvm use --delete-prefix ${NODE_VERSION}
  node ./node_modules/prebuild/bin.js --all --strip -u ${GITHUB_TOKEN}
fi
