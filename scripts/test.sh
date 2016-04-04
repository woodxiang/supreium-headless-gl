#!/usr/bin/env bash

set -e
set -o pipefail

source ~/.nvm/nvm.sh
nvm use ${NODE_VERSION}

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  # source ./scripts/setup.sh
  export DISPLAY=:99.0
  sh -e /etc/init.d/xvfb start
  sleep 5
  xvfb-run -s "-ac -screen 0 1280x1024x24" node_modules/bin/tape test/*.js
else
  npm test
fi
