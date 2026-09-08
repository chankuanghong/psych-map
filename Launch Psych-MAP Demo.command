#!/bin/zsh
cd "${0:A:h}" || exit 1
/usr/bin/env node demo-console.mjs "$@"
exit_code=$?
if [[ $exit_code -ne 0 ]]; then
  echo
  echo "Press any key to close this window."
  read -k 1
fi
exit $exit_code
