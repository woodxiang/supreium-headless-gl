#!/bin/bash

set -eo pipefail

# Inspect binary.
if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
    source ~/.nvm/nvm.sh
    ldd ./build/Release/webgl.node
else
    source ~/.bashrc
    otool -L ./build/Release/webgl.node
fi

COMMIT_MESSAGE=$(git show -s --format=%B $TRAVIS_COMMIT | tr -d '\n')
PACKAGE_JSON_VERSION=$(node -e "console.log(require('./package.json').version)")

#if [[ ${TRAVIS_TAG} == v${PACKAGE_JSON_VERSION} ]]; then
echo "running prebuild"
nvm use --delete-prefix ${NODE_VERSION}
node ./node_modules/prebuild/bin.js --all --strip -u <github-token>
#fi
