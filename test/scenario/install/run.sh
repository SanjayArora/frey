#!/usr/bin/env bash

set -o pipefail
set -o errexit
set -o nounset
# set -o xtrace

# Set magic variables for current FILE & DIR
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
__base="$(basename ${__file} .sh)"
__root="$(cd "$(dirname $(dirname $(dirname "${__dir}")))" && pwd)"
__sysTmpDir="${TMPDIR:-/tmp}"
__sysTmpDir="${__sysTmpDir%/}" # <-- remove trailing slash on macosx

# PYTHONPATH="${HOME}/.frey/tools/pip/lib/python2.7/site-packages" \
#   "${HOME}/.frey/tools/pip/bin/ansible" \
#   --help 2>&1
#
# exit

echo WIP
exit 0

rm -f terraform.plan
rm -f "${__sysTmpDir}/frey-install"* || true

"${__root}/node_modules/.bin/coffee" "${__root}/bin/frey" refresh \
  --sshkeys "${__sysTmpDir}" \
  --no-color \
  --verbose \
  --force-yes \
  --bail \
&& true

"${__root}/node_modules/.bin/coffee" "${__root}/bin/frey" install \
  --sshkeys "${__sysTmpDir}" \
  --no-color \
  --verbose \
  --force-yes \
  --bail \
&& true

echo "Finished"
