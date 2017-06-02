#!/usr/bin/env bash

# Running prepare before other scenarios is important on Travis,
# so that stdio can diverge - and we can enforce stricter
# stdio comparison on all other tests.

# set -o pipefail
set -o errexit
set -o nounset
# set -o xtrace

# Set magic variables for current FILE & DIR
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# __file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
# __base="$(basename ${__file} .sh)"
__root="$(cd "$(dirname "$(dirname "$(dirname "${__dir}")")")" && pwd)"
__sysTmpDir="${TMPDIR:-/tmp}"
__sysTmpDir="${__sysTmpDir%/}" # <-- remove trailing slash on macosx
__node="node"; __codelib="lib"
__nodeMajor="$(node -v |sed 's/v/./' |awk -F. '{print $2}')"
if [[ "${OSTYPE}" == "darwin"* ]] && [ "${__nodeMajor}" -ge 6 ]; then
  __node="node"; __codelib="src"
fi

# We don't want to enforce PIP versions since that's affects the
# user's global state.
# Yet, that's the only way to have equal install output.
# That's why we only care about the exit code in this test, and
# specify:
echo "ACCPTST:STDIO_SKIP_COMPARE"

rm -f "${__sysTmpDir}/frey-prepare"* || true

git init > /dev/null 2>&1 || true

# node "${__root}/lib/cli.js" prepare \
env -i \
PATH=${PATH} \
USER=${USER} \
SCROLEX_MODE=${SCROLEX_MODE:-} \
HOME=${HOME} \
FREY_SHOULD_BE_AS_VAR_IN_TERRAFORM=now \
"${__node}" "${__root}/${__codelib}/cli.js" config \
  --cfgVar "global.ssh.key_dir=${__sysTmpDir}" \
  --cfgVar "infra.provider.aws.region=eu-west-1" \
  --project-dir "." \
  --bail

file=Freyfile.hcl
echo "--> ${file}"
cat "${file}"
echo ""
for file in Frey-residu-*; do
  echo "--> ${file}"
  cat "${file}"
  echo ""
  echo ""
done

rm -f Frey-residu* > /dev/null 2>&1 || true
exit 0
