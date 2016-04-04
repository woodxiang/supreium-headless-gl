#!/usr/bin/env bash

set -e
set -o pipefail

pwd
ls

source ~/.nvm/nvm.sh
nvm use ${NODE_VERSION}


if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  export PATH="`pwd`/mason:${PATH}" MASON_DIR="`pwd`/mason"

  # Install Mesa
  mason install mesa 10.4.3

  # Make sure we're connecting to xvfb
  export DISPLAY=:99.0

  # Make sure we're loading the 10.4.3 libs we installed manually
  # export LD_LIBRARY_PATH="`mason prefix mesa 10.4.3`/lib:${LD_LIBRARY_PATH:-}"

  sudo LD_LIBRARY_PATH="`mason prefix mesa 10.4.3`/lib:${LD_LIBRARY_PATH:-}" xvfb-run --server-num=99 -s "-ac -screen 0 1280x1024x24" `which node` test/simple-shader.js
else
  npm test
fi
