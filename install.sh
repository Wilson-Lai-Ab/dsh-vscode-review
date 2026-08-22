#!/usr/bin/env bash
# dsh-vscode-review — one-click install for dsh + VSCode
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo '=== [1/4] Install dsh-review ==='
dsh plugin --profile web add "$ROOT/packages/dsh-review"

echo '=== [2/4] Install dsh-review-changes ==='
dsh plugin --profile web add "$ROOT/packages/dsh-review-changes"

echo '=== [3/4] Install VSCode extension ==='
VSIX="$ROOT/vscode_dsh_plugin/dsh-review-vscode-0.1.0.vsix"
if [ -f "$VSIX" ]; then
  code --install-extension "$VSIX" --force
else
  echo 'VSIX not found; copying dev source into ~/.vscode/extensions instead.'
  DEST="$HOME/.vscode/extensions/dsn.dsh-review-vscode-0.1.0"
  mkdir -p "$DEST"
  cp -R "$ROOT/vscode_dsh_plugin/extension.js" \
        "$ROOT/vscode_dsh_plugin/package.json" \
        "$ROOT/vscode_dsh_plugin/lib" \
        "$ROOT/vscode_dsh_plugin/media" \
        "$DEST/"
fi

echo '=== [4/4] Enable per-hunk Accept/Reject (VS Code proposed API) ==='
node "$ROOT/vscode_dsh_plugin/lib/proposed-api.js"

echo '=== Done ==='
echo '1. Restart dsh web.'
echo '2. FULLY quit VS Code (Cmd+Q / Alt+F4), then reopen — Reload Window is not enough.'
echo '   Per-hunk Accept/Reject needs editorInsets via argv.json enable-proposed-api.'
