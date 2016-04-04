#!/usr/bin/env bash
# This script is sourced; do not set -e or -o pipefail here.

if [[ ${TRAVIS_OS_NAME} == "linux" ]]; then

  # Ensure mason is on the PATH
  #export PATH="`pwd`/mason:${PATH}" MASON_DIR="`pwd`/mason"

  # Install Mesa
  #mason install mesa 10.4.3

  ##############################################################################
  # X Server setup
  ##############################################################################

  # Make sure we're connecting to xvfb
  export DISPLAY=:99.0

  # Make sure we're loading the 10.4.3 libs we installed manually
  #export LD_LIBRARY_PATH="`mason prefix mesa 10.4.3`/lib:${LD_LIBRARY_PATH:-}"

  # Start the mock X server
  #if [ -f /etc/init.d/xvfb ] ; then
  sudo sh -e /etc/init.d/xvfb start
  sleep 5 # sometimes, xvfb takes some time to start up
  #fi

  glxinfo
fi
