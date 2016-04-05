#!/usr/bin/env bash
set -o pipefail

if [[ ${TRAVIS_OS_NAME} == "osx" ]]; then
  brew install nvm
fi
