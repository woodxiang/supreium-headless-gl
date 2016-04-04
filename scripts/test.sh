#!/usr/bin/env bash

set -e
set -o pipefail

pwd
ls

# source ~/.nvm/nvm.sh
nvm use ${NODE_VERSION}


if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then

  # Set up mason
  export PATH="`pwd`/mason:${PATH}" MASON_DIR="`pwd`/mason"
  mason install mesa 11.1.2

  sudo LD_LIBRARY_PATH="`mason prefix mesa 10.4.3`/lib:${LD_LIBRARY_PATH:-}" xvfb-run --auto-servernum --server-num=1 -s "-ac -screen 0 1280x1024x24" `which glxinfo`

  sudo LD_LIBRARY_PATH="`mason prefix mesa 10.4.3`/lib:${LD_LIBRARY_PATH:-}" xvfb-run --auto-servernum --server-num=1 -s "-ac -screen 0 1280x1024x24" `which node` test/simple-shader.js
else
  npm test
fi
