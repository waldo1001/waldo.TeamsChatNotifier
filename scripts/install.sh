#!/usr/bin/env bash
# Teams Chat Notifier — macOS Installer
# Downloads and installs without Gatekeeper warnings.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/waldo1001/waldo.TeamsChatNotifier/main/scripts/install.sh | bash
#
set -euo pipefail

REPO="waldo1001/waldo.TeamsChatNotifier"
APP_NAME="Teams Chat Notifier"
INSTALL_DIR="/Applications"

# ── Detect architecture ──────────────────────────────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  arm64) ARCH_SUFFIX="arm64-mac" ;;
  x86_64) ARCH_SUFFIX="mac" ;;
  *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
esac

# ── Get latest release tag ───────────────────────────────────────────────────
echo "🔍 Finding latest release..."
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$TAG" ]; then
  echo "❌ Could not find latest release"; exit 1
fi
VERSION="${TAG#v}"
echo "📦 Latest version: $VERSION"

# ── Build download URL ───────────────────────────────────────────────────────
ZIP_NAME="${APP_NAME}-${VERSION}-${ARCH_SUFFIX}.zip"
# GitHub release asset URLs use URL-encoded spaces (%20)
ZIP_URL="https://github.com/$REPO/releases/download/$TAG/$(echo "$ZIP_NAME" | sed 's/ /%20/g')"
echo "⬇️  Downloading $ZIP_NAME..."

# ── Download and extract ─────────────────────────────────────────────────────
TMPDIR_PATH=$(mktemp -d)
trap 'rm -rf "$TMPDIR_PATH"' EXIT

curl -fSL "$ZIP_URL" -o "$TMPDIR_PATH/app.zip"
echo "📂 Extracting..."
ditto -xk "$TMPDIR_PATH/app.zip" "$TMPDIR_PATH/extracted"

# ── Find the .app bundle ─────────────────────────────────────────────────────
APP_PATH=$(find "$TMPDIR_PATH/extracted" -maxdepth 2 -name "*.app" -type d | head -1)
if [ -z "$APP_PATH" ]; then
  echo "❌ Could not find .app bundle in archive"; exit 1
fi

# ── Remove quarantine flag (prevents Gatekeeper warnings) ────────────────────
xattr -cr "$APP_PATH" 2>/dev/null || true

# ── Kill running instance ────────────────────────────────────────────────────
pkill -f "$APP_NAME" 2>/dev/null || true
sleep 0.5

# ── Install ──────────────────────────────────────────────────────────────────
DEST="$INSTALL_DIR/$APP_NAME.app"
if [ -d "$DEST" ]; then
  echo "🔄 Replacing existing installation..."
  rm -rf "$DEST"
fi
cp -R "$APP_PATH" "$DEST"
xattr -cr "$DEST" 2>/dev/null || true

echo "✅ $APP_NAME $VERSION installed to $INSTALL_DIR"
echo ""
echo "Launch with:  open -a '$APP_NAME'"

# ── Optionally launch ───────────────────────────────────────────────────────
read -r -p "🚀 Launch now? [Y/n] " response
response=${response:-Y}
if [[ "$response" =~ ^[Yy]$ ]]; then
  open -a "$APP_NAME"
fi
