#!/usr/bin/env bash

set -e
set -o pipefail

sudo rm -rf /usr/local/opt/nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then
  source ~/.nvm/nvm.sh
else
  source ~/.bashrc
fi

nvm install ${NODE_VERSION}
nvm alias default ${NODE_VERSION}
nvm use ${NODE_VERSION}

node --version
npm --version
