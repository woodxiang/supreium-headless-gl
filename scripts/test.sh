#!/usr/bin/env bash

set -e
set -o pipefail

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  source ~/.nvm/nvm.sh
else
  source ~/.bashrc
fi
nvm use ${NODE_VERSION}

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  sudo xvfb-run --auto-servernum --server-num=1 -s "-ac -screen 0 1280x1024x24" `which glxinfo`

  sudo xvfb-run --auto-servernum --server-num=1 -s "-ac -screen 0 1280x1024x24" `which node` test/simple-shader.js
else
  npm test
fi
