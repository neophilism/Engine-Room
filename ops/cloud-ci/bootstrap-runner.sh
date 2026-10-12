#!/usr/bin/env bash
# Installs one repository-scoped, non-root GitHub Actions runner on a trusted Ubuntu VM.
# No long-lived GitHub PAT is required; a short-lived registration token is entered privately.
set -Eeuo pipefail
umask 077

die() { echo "ERROR: $*" >&2; exit 1; }

if [ "$#" -ne 1 ]; then
  echo "Usage: sudo bash bootstrap-runner.sh neophilism/REPOSITORY" >&2
  exit 2
fi
REPO="$1"
[[ "$REPO" =~ ^neophilism/[a-zA-Z0-9._-]+$ ]] || die "Only neophilism owner repositories are supported."
[ "$(id -u)" -eq 0 ] || die "Run as root with sudo on the VM."
[ -t 0 ] || die "Run interactively over SSH/console; never pass tokens as command arguments."
[ "$(uname -s)" = Linux ] || die "Linux is required."
command -v apt-get >/dev/null || die "This installer requires Ubuntu/Debian apt."
case "$(uname -m)" in
  aarch64|arm64) ARCH=arm64 ;;
  x86_64) ARCH=x64 ;;
  *) die "Unsupported architecture: $(uname -m)" ;;
esac
command -v systemctl >/dev/null || die "systemd is required."
SAFE_NAME="$(printf '%s' "$REPO" | tr '[:upper:]' '[:lower:]' | tr '/._' '---' | tr -cd 'a-z0-9-')"
RUNNER_NAME="oci-$(printf '%s' "$SAFE_NAME" | cut -c1-42)"
RUNNER_DIR="/opt/gh-ci-runners/$(printf '%s' "$REPO" | cut -d/ -f2)"
RUNNER_USER="gha-$(printf '%s' "$REPO" | sha256sum | cut -c1-12)"
if [ -f "$RUNNER_DIR/.runner" ]; then
  die "A runner is already configured at $RUNNER_DIR; inspect it rather than reinstalling."
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl jq git tar libicu-dev
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
RELEASE="$(curl -fsSL --retry 3 --max-time 30 -H 'Accept: application/vnd.github+json' https://api.github.com/repos/actions/runner/releases/latest)"
ASSET_LINE="$(printf '%s' "$RELEASE" | jq -er --arg arch "$ARCH" '.tag_name as $tag | .assets[] | select(.name == ("actions-runner-linux-" + $arch + "-" + ($tag | ltrimstr("v")) + ".tar.gz")) | [.browser_download_url,.digest] | @tsv')"
IFS=$'\t' read -r ASSET_URL ASSET_DIGEST <<< "$ASSET_LINE"
[[ "$ASSET_URL" == https://github.com/actions/runner/releases/download/* ]] || die "Unexpected runner download URL."
[[ "$ASSET_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || die "Missing trusted SHA-256 release digest."
ARCHIVE="$TEMP_DIR/runner.tar.gz"
curl -fL --retry 3 --max-time 360 -o "$ARCHIVE" "$ASSET_URL"
printf '%s  %s\n' "$(printf '%s' "$ASSET_DIGEST" | cut -d: -f2)" "$ARCHIVE" | sha256sum -c -

install -d -m 0750 /opt/gh-ci-runners
if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$RUNNER_DIR" --shell /bin/bash "$RUNNER_USER"
fi
install -d -m 0750 -o "$RUNNER_USER" -g "$RUNNER_USER" "$RUNNER_DIR"
tar -xzf "$ARCHIVE" -C "$RUNNER_DIR" --no-same-owner
chown -R "$RUNNER_USER:$RUNNER_USER" "$RUNNER_DIR"
cd "$RUNNER_DIR"
./bin/installdependencies.sh

echo
echo "Open: https://github.com/$REPO/settings/actions/runners/new"
echo "Choose Linux, then copy only the short-lived registration token shown there."
echo "Enter it here on the VM console (input hidden). Never paste it into ChatGPT."
read -r -s -p "One-hour runner registration token: " REG_TOKEN
echo
[ -n "$REG_TOKEN" ] || die "Registration token cannot be empty."
runuser -u "$RUNNER_USER" -- ./config.sh --unattended --url "https://github.com/$REPO" --token "$REG_TOKEN" --name "$RUNNER_NAME" --labels "oci-free,$SAFE_NAME" --work _work --replace
unset REG_TOKEN
./svc.sh install "$RUNNER_USER"
./svc.sh start
./svc.sh status
echo "Repository runner installed. Check https://github.com/$REPO/settings/actions/runners"
echo "Do not attach this long-lived VM to untrusted pull-request workflows or add it to the Docker group without a security review."
