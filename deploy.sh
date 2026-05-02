#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  Etisalat Billing Dashboard — Azure Free Deploy
#  Run once: bash deploy.sh
#  Requires: Azure CLI (az) installed and logged in
# ═══════════════════════════════════════════════════════════
set -e

APP="etisalat-billing-dashboard"
RG="etisalat-rg"
LOC="eastus2"
SENDER="elston.dsouza@pjprestaurants.com"

echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Etisalat Billing Dashboard — Azure FREE Deploy       ║"
echo "║  Cost: \$0/month forever                               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check Azure CLI
command -v az >/dev/null 2>&1 || { echo "Install Azure CLI: https://aka.ms/installazurecli"; exit 1; }

# Login
echo "► Checking login..."
az account show >/dev/null 2>&1 || az login
TENANT=$(az account show --query tenantId -o tsv)
echo "  Tenant: $TENANT"

# Resource group
echo "► Resource group..."
az group create --name $RG --location $LOC --output none
echo "  Done: $RG"

# Azure AD App
echo "► Azure AD App Registration..."
APP_ID=$(az ad app create --display-name "Etisalat Billing Dashboard" --sign-in-audience AzureADMyOrg --query appId -o tsv)
az ad sp create --id "$APP_ID" --output none 2>/dev/null || true
SECRET=$(az ad app credential reset --id "$APP_ID" --append --years 2 --query password -o tsv)
echo "  App ID: $APP_ID"

# Graph permissions
echo "► Adding Graph permissions..."
for PERM in "b633e1c5-b582-4048-a93e-9f11b44c7e96=Role" "75359482-378d-4052-8f01-80520e7db3cd=Role" "df021288-bdef-4463-88db-98f22de89214=Role"; do
  az ad app permission add --id "$APP_ID" --api "00000003-0000-0000-c000-000000000000" --api-permissions "$PERM" --output none 2>/dev/null || true
done
echo "  Mail.Send + Files.ReadWrite.All + User.Read.All added"

# Static Web App
echo "► Creating Static Web App (Free)..."
az staticwebapp create --name $APP --resource-group $RG --location $LOC --sku Free --output none
HOSTNAME=$(az staticwebapp show --name $APP --resource-group $RG --query defaultHostname -o tsv)
TOKEN=$(az staticwebapp secrets list --name $APP --resource-group $RG --query "properties.apiKey" -o tsv)
echo "  URL: https://$HOSTNAME"

# Environment variables
echo "► Setting environment variables..."
az staticwebapp appsettings set --name $APP --resource-group $RG --setting-names \
  AZURE_CLIENT_ID="$APP_ID" AZURE_CLIENT_SECRET="$SECRET" AZURE_TENANT_ID="$TENANT" \
  SENDER_EMAIL="$SENDER" SENDER_NAME="Elston Shon Dsouza" \
  ONEDRIVE_MASTER_FOLDER="Etisalat master" ONEDRIVE_DOCS_FOLDER="Etisalat documents" \
  MASTER_FILE_NAME="etisalat_master.csv" NODE_ENV="production" --output none
echo "  Done"

# Save .env
cat > .env << EOF
AZURE_CLIENT_ID=$APP_ID
AZURE_CLIENT_SECRET=$SECRET
AZURE_TENANT_ID=$TENANT
SENDER_EMAIL=$SENDER
ONEDRIVE_MASTER_FOLDER=Etisalat master
ONEDRIVE_DOCS_FOLDER=Etisalat documents
MASTER_FILE_NAME=etisalat_master.csv
NODE_ENV=production
EOF
echo "$TOKEN" > .deploy-token

# Deploy
echo "► Installing dependencies..."
cd api && npm ci --production -q && cd ..
echo "► Deploying (this takes ~60 seconds)..."
npx --yes @azure/static-web-apps-cli deploy \
  --app-location public \
  --api-location api \
  --env production \
  --deployment-token "$TOKEN" \
  --no-use-keychain 2>/dev/null || \
swa deploy --app-location public --api-location api --env production --deployment-token "$TOKEN" --no-use-keychain

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DEPLOYED SUCCESSFULLY                                         ║"
printf "║  URL     : https://%-44s║\n" "$HOSTNAME"
printf "║  Health  : https://%s/api/health\n" "$HOSTNAME"
echo "║  Cost    : \$0/month (Azure Free Tier)                         ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  REQUIRED: Grant admin consent at:                             ║"
printf "║  https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/CallAnAPI/appId/%s\n" "$APP_ID"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  FOR AUTO-DEPLOY (GitHub):                                     ║"
echo "║  Add secret AZURE_STATIC_WEB_APPS_API_TOKEN = $(cat .deploy-token | head -c 20)... ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
sleep 20
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$HOSTNAME/api/health" 2>/dev/null || echo "000")
[ "$STATUS" = "200" ] && echo "✅  Live and healthy!" || echo "⚠  Warming up — check https://$HOSTNAME/api/health in 1 min"
