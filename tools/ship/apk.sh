#!/usr/bin/env bash
# Build the RenderBlocks debug APK for one commit, the same way for every agent.
#
# Every APK is built here, in WSL Ubuntu-22.04, so they all use the same Java,
# Android SDK and debug signing key, and each one installs over the last on the tablet.
#
#   From WSL:     /home/primed/localcode/renderblocks/tools/ship/apk.sh [<commit>] [--out <dir>]
#   From Windows: wsl.exe -d Ubuntu-22.04 -u primed -- bash /home/primed/localcode/renderblocks/tools/ship/apk.sh [<commit>] [--out <dir>]
#
# <commit> defaults to origin/master. Without --out, the commit must already be on
# origin/master, and the APK is copied to the Drive folder. It never overwrites an APK.
# With --out <dir>, any commit can be built, for a test, and the APK goes to <dir>.
#
# The script runs from the build checkout, /home/primed/localcode/renderblocks. Nobody
# works in that folder: this script keeps it on the latest master and builds each
# commit in a temporary worktree.

main() {
  set -euo pipefail
  trap 'echo "apk.sh stopped with an error at line $LINENO." >&2' ERR

  local HOST=/home/primed/localcode/renderblocks
  local DRIVE=/mnt/d/PrimeDSharedGDrive/RenderBlocks
  local LOCK=/tmp/renderblocks-gradle.lock
  local commit=origin/master out='' test=0
  local args=("$@")

  while [ $# -gt 0 ]; do
    case "$1" in
      --out) out="$2"; test=1; shift 2 ;;
      -h|--help) sed -n '2,16p' "${BASH_SOURCE[0]}"; return 0 ;;
      *) commit="$1"; shift ;;
    esac
  done
  [ -n "$out" ] || out="$DRIVE"

  # One build at a time on this machine; a second build waits here.
  exec 9>"$LOCK"
  if ! flock -n 9; then echo "Another APK build is running; waiting for it..."; flock 9; fi

  git -C "$HOST" fetch -q origin

  # Keep the build checkout on the latest master, then rerun the newest copy of this script.
  if [ "$(git -C "$HOST" symbolic-ref --short HEAD 2>/dev/null)" = master ] && [ -z "$(git -C "$HOST" status --porcelain)" ]; then
    git -C "$HOST" merge -q --ff-only origin/master
  else
    echo "Note: $HOST is not a clean master checkout, so it was not updated." >&2
  fi
  if [ -z "${APK_FRESH:-}" ] && [ -f "$HOST/tools/ship/apk.sh" ] && ! cmp -s "$HOST/tools/ship/apk.sh" "${BASH_SOURCE[0]}"; then
    exec 9>&-
    APK_FRESH=1 exec bash "$HOST/tools/ship/apk.sh" "${args[@]}"
  fi

  local sha
  sha=$(git -C "$HOST" rev-parse --verify -q "$commit^{commit}") || { echo "Unknown commit: $commit" >&2; return 1; }
  if [ "$test" = 0 ] && ! git -C "$HOST" merge-base --is-ancestor "$sha" origin/master; then
    echo "Commit ${sha:0:7} is not on origin/master. Land it first, or use --out <dir> for a test build." >&2
    return 1
  fi

  local gradle name code apk
  gradle=$(git -C "$HOST" show "$sha:packages/app/android/app/build.gradle")
  name=$(sed -nE 's/^\s*versionName "([^"]+)".*/\1/p' <<<"$gradle")
  code=$(sed -nE 's/^\s*versionCode ([0-9]+).*/\1/p' <<<"$gradle")
  apk="renderblocks-v$name-debug.apk"
  echo "Building ${sha:0:7}: v$name (versionCode $code)"

  mkdir -p "$out"
  if [ -e "$out/$apk" ]; then
    echo "$out/$apk already exists. Another build took v$name: take the next version number." >&2
    return 1
  fi

  local wt
  wt=$(mktemp -d "${TMPDIR:-/tmp}/renderblocks-apk-XXXXXX")
  trap "git -C '$HOST' worktree remove --force '$wt' >/dev/null 2>&1 || rm -rf '$wt'" EXIT
  git -C "$HOST" worktree add -q --detach "$wt" "$sha"

  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
  export ANDROID_HOME=/home/primed/android-sdk
  set +u
  # shellcheck disable=SC1091
  source ~/.nvm/nvm.sh >/dev/null
  nvm use 22 >/dev/null
  set -u

  ( cd "$wt" && pnpm install --frozen-lockfile --prefer-offline --reporter=silent )
  ( cd "$wt/packages/app" && pnpm build >/dev/null && npx cap sync android >/dev/null )
  ( cd "$wt/packages/app/android" && ./gradlew clean assembleDebug -q )

  local built="$wt/packages/app/android/app/build/outputs/apk/debug/$apk"
  [ -f "$built" ] || { echo "The build finished but $apk is missing." >&2; return 1; }

  local aapt badging
  aapt=$(ls -d "$ANDROID_HOME"/build-tools/*/aapt | sort -V | tail -1)
  badging=$("$aapt" dump badging "$built" 2>/dev/null | sed -n 1p)
  grep -q "versionCode='$code'" <<<"$badging" && grep -q "versionName='$name'" <<<"$badging" || {
    echo "The APK's version does not match build.gradle: $badging" >&2; return 1; }

  cp -n "$built" "$out/$apk"
  cmp -s "$built" "$out/$apk" || { echo "Could not copy to $out/$apk (did another build just take it?)" >&2; return 1; }
  echo "Done: $out/$apk"
  echo "      ${sha:0:7}, versionCode $code, $(du -h "$out/$apk" | cut -f1)"
}

main "$@"
