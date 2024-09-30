set -e

rm -rf scratch-git || true
git submodule update --remote
rm -rf src-server/diff || true
rm -rf src-server/git.rs src-server/sb3.rs || true
mv scratch-git/src-server/diff src-server/diff
mv scratch-git/src-server/git.rs src-server
mv scratch-git/src-server/sb3.rs src-server
rm -rf scratch-git