@description('Location for all resources.')
param location string = 'westus2'

@description('Name prefix for all resources.')
param namePrefix string = 'payafrika'

@description('PostgreSQL connection string (e.g. from Neon, Supabase, or Azure).')
@secure()
param connectionString string

@description('JWT secret key (min 32 chars).')
@secure()
param jwtSecret string

@description('GitHub Container Registry image URL (e.g. ghcr.io/your-org/payafrika-backend:latest)')
param imageUrl string = ''

@description('GitHub Container Registry token (PAT with packages:read scope).')
@secure()
param ghcrToken string = ''

@description('Payment provider API keys.')
@secure()
param flutterwaveSecretKey string = ''

@secure()
param paystackSecretKey string = ''

@secure()
param ozowApiKey string = ''

@secure()
param peachBearerToken string = ''

var envName = '${namePrefix}-env'
var containerName = '${namePrefix}-api'
var logName = '${namePrefix}-logs'

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
  }
}

resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerName
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        allowInsecure: false
        traffic: [
          { latestRevision: true, weight: 100 }
        ]
      }
      registries: [
        {
          server: 'ghcr.io'
          username: 'Preva54'
          passwordSecretRef: 'ghcr-pull-secret'
        }
      ]
      secrets: [
        {
          name: 'ghcr-pull-secret'
          value: ghcrToken
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: imageUrl
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
            { name: 'ASPNETCORE_URLS', value: 'http://+:8080' }
            { name: 'ConnectionStrings__DefaultConnection', value: connectionString }
            { name: 'Jwt__SecretKey', value: jwtSecret }
            { name: 'Jwt__Issuer', value: 'PayAfrika' }
            { name: 'Jwt__Audience', value: 'PayAfrika' }
            { name: 'Jwt__TokenExpirationMinutes', value: '60' }
            { name: 'Payment__Flutterwave__SecretKey', value: flutterwaveSecretKey }
            { name: 'Payment__Flutterwave__BaseUrl', value: 'https://api.flutterwave.com/v3' }
            { name: 'Payment__Paystack__SecretKey', value: paystackSecretKey }
            { name: 'Payment__Paystack__BaseUrl', value: 'https://api.paystack.co' }
            { name: 'Payment__Ozow__ApiKey', value: ozowApiKey }
            { name: 'Payment__Ozow__BaseUrl', value: 'https://api.ozow.com' }
            { name: 'Payment__Peach__BearerToken', value: peachBearerToken }
            { name: 'Payment__Peach__BaseUrl', value: 'https://api.peachpayments.com' }
            { name: 'Cors__AllowedOrigins', value: '["https://payafrika.vercel.app","https://www.payafrika.vercel.app"]' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

output appUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
