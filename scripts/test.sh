#!/usr/bin/env bash

set -e
set -o pipefail

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
    source ./scripts/setup.sh
fi

source ~/.nvm/nvm.sh
nvm use ${NODE_VERSION}

npm run rebuild
xvfb-run -s "-ac -screen 0 1280x1024x24” npm test
