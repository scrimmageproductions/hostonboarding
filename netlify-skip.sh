#!/bin/bash

# Skip Netlify build unless DEPLOY_ENABLED=true is set
if [[ "$DEPLOY_ENABLED" != "true" ]]; then
  echo "Skipping build - DEPLOY_ENABLED is not set to true"
  exit 0
fi

# Proceed with build
exit 1
