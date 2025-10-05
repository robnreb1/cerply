#!/usr/bin/env bash
# web/scripts/lighthouse-ci.sh
# Run Lighthouse CI checks for accessibility (≥90 score required per FSD §17)

set -euo pipefail

WEB_URL="${WEB_URL:-http://localhost:3000}"
LHCI_MIN_SCORE="${LHCI_MIN_SCORE:-90}"

echo "==> Running Lighthouse CI for: $WEB_URL"
echo "==> Minimum A11y score: $LHCI_MIN_SCORE"

# Check if lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
  echo "Error: lighthouse not found. Installing @lhci/cli globally..."
  npm install -g @lhci/cli lighthouse
fi

# Run Lighthouse for mobile
echo ""
echo "==> Mobile audit..."
lighthouse "$WEB_URL" \
  --only-categories=accessibility \
  --chrome-flags="--headless" \
  --output=json \
  --output-path=/tmp/lh-mobile.json \
  --form-factor=mobile

MOBILE_SCORE=$(node -e "console.log(Math.round(require('/tmp/lh-mobile.json').categories.accessibility.score * 100))")
echo "Mobile A11y Score: $MOBILE_SCORE"

# Run Lighthouse for desktop
echo ""
echo "==> Desktop audit..."
lighthouse "$WEB_URL" \
  --only-categories=accessibility \
  --chrome-flags="--headless" \
  --output=json \
  --output-path=/tmp/lh-desktop.json \
  --form-factor=desktop \
  --screen-emulation.mobile=false

DESKTOP_SCORE=$(node -e "console.log(Math.round(require('/tmp/lh-desktop.json').categories.accessibility.score * 100))")
echo "Desktop A11y Score: $DESKTOP_SCORE"

# Check minimum scores
echo ""
if [ "$MOBILE_SCORE" -lt "$LHCI_MIN_SCORE" ]; then
  echo "❌ FAIL: Mobile A11y score ($MOBILE_SCORE) is below minimum ($LHCI_MIN_SCORE)"
  exit 1
fi

if [ "$DESKTOP_SCORE" -lt "$LHCI_MIN_SCORE" ]; then
  echo "❌ FAIL: Desktop A11y score ($DESKTOP_SCORE) is below minimum ($LHCI_MIN_SCORE)"
  exit 1
fi

echo "✅ PASS: Both mobile ($MOBILE_SCORE) and desktop ($DESKTOP_SCORE) meet the minimum A11y score of $LHCI_MIN_SCORE"

