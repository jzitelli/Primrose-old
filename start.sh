#!/bin/bash
#
# This Source Code Form is subject to the terms of the

export PYSERVER_STATIC_FOLDER=`pwd`
export PYSERVER_TEMPLATE_FOLDER=`pwd`/pyserver/templates
export PYSERVER_DEBUG=1
# export PYSERVER_STAGING=0
# export PYSERVER_RELEASE=0

## Parse the command line
##
while [ $# -gt 0 ]
do
  case $1 in
    --staging)
      echo "*** RUNNING SERVER IN STAGING MODE ***"
      export PYSERVER_STAGING=1
      break;
      ;;
    --release)
      echo "*** RUNNING SERVER IN RELEASE MODE ***"
      export PYSERVER_RELEASE=1
      break;
      ;;
    *)
      echo "*** RUNNING SERVER IN DEBUG MODE ***"
      break;
      ;;
  esac
done

python pyserver/tornado_app.py
