#!/usr/bin/env bash

set -e
set -o pipefail

sudo rm -rf /usr/local/opt/nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash

source ~/.nvm/nvm.sh

nvm install ${NODE_VERSION}
nvm alias default ${NODE_VERSION}
nvm use ${NODE_VERSION}

node --version
npm --version
