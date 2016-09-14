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
__node="node"; __codelib="lib"
if [[ "${OSTYPE}" == "darwin"* ]]; then
  __node="babel-node"; __codelib="src"
fi

git init 2>&1 > /dev/null || true
rm -f *.pem 2>&1 > /dev/null || true
rm -f Freyfile.hcl 2>&1 > /dev/null || true

# We seem to not be able to guarantee the create order of multiple web hosts, so override with count = 1 in tests
"${__node}" "${__root}/${__codelib}/cli.js" convert --projectDir .\
  --no-color \
  --force-yes \
|| false

cat Freyfile.hcl

rm -f *.pem 2>&1 > /dev/null || true
rm -f Frey-residu* 2>&1 > /dev/null || true

echo "Finished"
