#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  Push Etisalat Dashboard to GitHub
#  Usage: bash push-to-github.sh YOUR_GITHUB_USERNAME
# ═══════════════════════════════════════════════════════════

set -e

GITHUB_USER="${1:-}"
REPO_NAME="etisalat-billing-dashboard"

if [ -z "$GITHUB_USER" ]; then
  read -p "Enter your GitHub username: " GITHUB_USER
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Pushing Etisalat Dashboard to GitHub                ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  Repo: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""

# Check git is installed
command -v git >/dev/null 2>&1 || { echo "ERROR: git not found. Install from https://git-scm.com"; exit 1; }

# Init git repo
echo "► Initialising git repository..."
git init -b main
git add .
git commit -m "Initial commit — Etisalat Billing Dashboard

- 313 PJP Restaurants employees with Etisalat mobile accounts
- Azure Static Web Apps + Functions (free tier)
- Microsoft Graph API: email via Outlook, files via OneDrive
- Monthly billing alerts with per-employee email templates
- OneDrive sync for master employee registry"

echo "  Done."
echo ""

# Push to GitHub
echo "► Pushing to GitHub..."
echo "  (You may be prompted for your GitHub password or personal access token)"
echo ""

git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
git push -u origin main

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  PUSHED SUCCESSFULLY                                      ║"
printf "║  Repo: https://github.com/%-33s║\n" "$GITHUB_USER/$REPO_NAME"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  NEXT: Connect to Azure Static Web Apps                  ║"
echo "║  1. Go to portal.azure.com                               ║"
echo "║  2. Create Static Web App → source = GitHub              ║"
echo "║  3. Select this repo → Azure deploys automatically       ║"
echo "╚══════════════════════════════════════════════════════════╝"
