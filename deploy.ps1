param(
  [Parameter()]
  [ValidateSet("frontend", "backend", "all")]
  [string]$Target = "all"
)

$ErrorActionPreference = "Stop"

# ---- Configuration (verified production values) ----
$ACR_NAME        = "pafrikav2acr"
$ACR_IMAGE       = "payafrika/backend"
$IMAGE_TAG       = "prod-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$RESOURCE_GROUP  = "payafrika-prod-v2"
$CONTAINER_APP   = "pafrikav2-api"
$API_BASE_URL    = "https://pafrikav2-api.ambitiousocean-b7255ba5.northeurope.azurecontainerapps.io/api"

function Deploy-Frontend {
  Write-Host "=== Deploying Frontend to Vercel (from repo root) ===" -ForegroundColor Cyan

  $vercel = Get-Command "vercel" -ErrorAction SilentlyContinue
  if (-not $vercel) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
  }

  Write-Host "Deploying to production (project root dir = frontend)..." -ForegroundColor Yellow
  vercel --prod --yes
  if ($LASTEXITCODE -ne 0) { throw "Vercel deploy failed" }
  Write-Host "Frontend deployed: https://payafrika.vercel.app" -ForegroundColor Green
}

function Deploy-Backend {
  Write-Host "=== Deploying Backend to Azure Container App ===" -ForegroundColor Cyan
  Write-Host "Prerequisites: Docker Desktop running, az CLI logged in (az login)." -ForegroundColor Yellow

  Write-Host "Checking Azure login..." -ForegroundColor Yellow
  az account show *> $null
  if ($LASTEXITCODE -ne 0) { throw "Not logged in. Run: az login" }

  Write-Host "Building image: $ACR_IMAGE`:$IMAGE_TAG" -ForegroundColor Yellow
  docker build -t "$ACR_NAME.azurecr.io/$ACR_IMAGE`:$IMAGE_TAG" -f backend/PayAfrika.API/Dockerfile backend/PayAfrika.API
  if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

  Write-Host "Pushing to ACR..." -ForegroundColor Yellow
  docker push "$ACR_NAME.azurecr.io/$ACR_IMAGE`:$IMAGE_TAG"
  if ($LASTEXITCODE -ne 0) { throw "Docker push failed" }

  Write-Host "Updating container app (new revision)..." -ForegroundColor Yellow
  az containerapp update --resource-group $RESOURCE_GROUP --name $CONTAINER_APP --image "$ACR_NAME.azurecr.io/$ACR_IMAGE`:$IMAGE_TAG"
  if ($LASTEXITCODE -ne 0) { throw "containerapp update failed" }

  Write-Host "Backend deployed: $API_BASE_URL" -ForegroundColor Green
  Write-Host "Image: $ACR_NAME.azurecr.io/$ACR_IMAGE`:$IMAGE_TAG" -ForegroundColor Green
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
Write-Host "=== Production Reference ===" -ForegroundColor Cyan
Write-Host "Frontend (Vercel):"
Write-Host "  NEXT_PUBLIC_API_URL  $API_BASE_URL"
Write-Host "  NEXT_PUBLIC_APP_URL  https://payafrika.vercel.app"
Write-Host ""
Write-Host "Backend (Azure Container App $CONTAINER_APP, RG $RESOURCE_GROUP):"
Write-Host "  ASPNETCORE_ENVIRONMENT            Production"
Write-Host "  ConnectionStrings__DefaultConnection  <Neon Postgres connection string>"
Write-Host "  Jwt__SecretKey                    <JWT signing key>"
Write-Host "  PAYAFRIKA_SECURITY_KEY            secretref:payafrika-security-key"
Write-Host "  Cors__AllowedOrigins              [https://payafrika.vercel.app,...]"
Write-Host "  Security__Email__Host             smtp.sendgrid.net (Password = secretref:sendgrid-api-key)"
Write-Host "  Security__Sms__AccountSid         <Twilio SID> (AuthToken = secretref:twilio-auth-token)"
Write-Host "  Security__Sms__FromNumber         <Twilio sender number>"
Write-Host ""
Write-Host "Secrets management: az containerapp secret set -n $CONTAINER_APP -g $RESOURCE_GROUP --secrets payafrika-security-key=... --environment <env>"
Write-Host "Note: ACR Tasks are blocked on this subscription - deploy via local Docker build/push (done above)."
