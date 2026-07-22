param(
  [Parameter(Mandatory)]
  [string]$ResourceGroupName,

  [Parameter()]
  [string]$Location = "eastus",

  [Parameter()]
  [string]$NamePrefix = "payafrika",

  [Parameter(Mandatory)]
  [securestring]$DbPassword,

  [Parameter(Mandatory)]
  [securestring]$JwtSecret,

  [Parameter()]
  [securestring]$FlutterwaveSecretKey,

  [Parameter()]
  [securestring]$PaystackSecretKey,

  [Parameter()]
  [securestring]$OzowApiKey,

  [Parameter()]
  [securestring]$PeachBearerToken
)

$ErrorActionPreference = "Stop"

Write-Host "=== PayAfrika Azure Deployment ===" -ForegroundColor Cyan

# Login
$account = az account show 2>$null
if (-not $account) {
  Write-Host "Logging in to Azure..." -ForegroundColor Yellow
  az login --output none
}

# Create resource group
Write-Host "Creating resource group '$ResourceGroupName'..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output none

# Deploy Bicep
Write-Host "Deploying infrastructure..." -ForegroundColor Yellow
$deployment = az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file "$PSScriptRoot/main.bicep" `
  --parameters `
    namePrefix=$NamePrefix `
    dbPassword=$(ConvertFrom-SecureString $DbPassword -AsPlainText) `
    jwtSecret=$(ConvertFrom-SecureString $JwtSecret -AsPlainText) `
    flutterwaveSecretKey=$(ConvertFrom-SecureString $FlutterwaveSecretKey -AsPlainText) `
    paystackSecretKey=$(ConvertFrom-SecureString $PaystackSecretKey -AsPlainText) `
    ozowApiKey=$(ConvertFrom-SecureString $OzowApiKey -AsPlainText) `
    peachBearerToken=$(ConvertFrom-SecureString $PeachBearerToken -AsPlainText) `
  --output json | ConvertFrom-Json

$appUrl = $deployment.properties.outputs.appUrl.value

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Backend URL: $appUrl"
Write-Host "2. Deploy the API:"
Write-Host "   cd backend/PayAfrika.API"
Write-Host "   dotnet publish -c Release -o publish"
Write-Host "   Compress-Archive -Path publish/* -DestinationPath publish.zip"
Write-Host "   az webapp deploy --resource-group $ResourceGroupName --name ${NamePrefix}-api --src-path publish.zip --type zip"
Write-Host ""
Write-Host "3. Update frontend env vars in Vercel:"
Write-Host "   NEXT_PUBLIC_API_URL = $appUrl/api"
Write-Host "   NEXT_PUBLIC_APP_URL = <your-vercel-url>"
Write-Host ""
Write-Host "4. Update CORS origins in Vercel dashboard if needed"
