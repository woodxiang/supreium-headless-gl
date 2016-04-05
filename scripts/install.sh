#!/usr/bin/env bash

set -o pipefail

nvm install ${NODE_VERSION}
nvm alias default ${NODE_VERSION}
nvm use ${NODE_VERSION}

node --version
npm --version

npm install --compile
