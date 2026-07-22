param(
  [Parameter()]
  [ValidateSet("frontend", "backend", "all")]
  [string]$Target = "all",

  [Parameter()]
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

function Deploy-Frontend {
  Write-Host "=== Deploying Frontend to Vercel ===" -ForegroundColor Cyan

  $vercel = Get-Command "vercel" -ErrorAction SilentlyContinue
  if (-not $vercel) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
  }

  Set-Location -LiteralPath "frontend"

  Write-Host "Linking project..." -ForegroundColor Yellow
  vercel link --yes 2>$null

  Write-Host "Setting environment variables..." -ForegroundColor Yellow
  vercel env add NEXT_PUBLIC_API_URL $Environment
  vercel env add NEXT_PUBLIC_APP_URL $Environment

  Write-Host "Deploying to $Environment..." -ForegroundColor Yellow
  if ($Environment -eq "production") {
    vercel --prod
  } else {
    vercel
  }

  Set-Location -LiteralPath ".."
  Write-Host "Frontend deployed!" -ForegroundColor Green
}

function Deploy-Backend {
  Write-Host "=== Deploying Backend to Azure ===" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Prerequisites:" -ForegroundColor Yellow
  Write-Host "  1. Azure CLI installed (https://aka.ms/install-azure-cli)"
  Write-Host "  2. Logged in: az login"
  Write-Host "  3. Resource group created"
  Write-Host ""
  Write-Host "Run the backend deployment script:" -ForegroundColor Yellow
  Write-Host "  .\backend\deploy\deploy.ps1 -ResourceGroupName payafrika-prod -DbPassword (ConvertTo-SecureString '...' -AsPlainText -Force) -JwtSecret (ConvertTo-SecureString '...' -AsPlainText -Force)"
  Write-Host ""
  Write-Host "Then deploy the API code:" -ForegroundColor Yellow
  Write-Host "  cd backend/PayAfrika.API"
  Write-Host "  dotnet publish -c Release -o publish"
  Write-Host "  Compress-Archive -Path publish/* -DestinationPath publish.zip"
  Write-Host "  az webapp deploy --resource-group payafrika-prod --name payafrika-api --src-path publish.zip --type zip"
}

function Deploy-All {
  Deploy-Frontend
  Deploy-Backend
}

switch ($Target) {
  "frontend" { Deploy-Frontend }
  "backend"  { Deploy-Backend }
  "all"      { Deploy-All }
}

Write-Host ""
Write-Host "=== Environment Variables Reference ===" -ForegroundColor Cyan
Write-Host "Frontend (Vercel):"
Write-Host "  NEXT_PUBLIC_API_URL   https://payafrika-api.azurewebsites.net/api"
Write-Host "  NEXT_PUBLIC_APP_URL   https://payafrika.vercel.app"
Write-Host ""
Write-Host "Backend (Azure App Service):"
Write-Host "  ASPNETCORE_ENVIRONMENT               Production"
Write-Host "  ConnectionStrings__DefaultConnection  Host=...;Database=payafrika;Username=...;Password=..."
Write-Host "  Jwt__SecretKey                        <your-secret>"
Write-Host "  Cors__AllowedOrigins                  [\"https://payafrika.vercel.app\"]"
Write-Host "  Payment__Flutterwave__SecretKey        <key>"
Write-Host "  Payment__Paystack__SecretKey           <key>"
Write-Host "  Payment__Ozow__ApiKey                  <key>"
Write-Host "  Payment__Peach__BearerToken            <token>"
