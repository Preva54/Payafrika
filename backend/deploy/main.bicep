@description('Location for all resources.')
param location string = resourceGroup().location

@description('Name prefix for all resources.')
param namePrefix string = 'payafrika'

@description('Administrator password for PostgreSQL.')
@secure()
param dbPassword string

@description('JWT secret key (min 32 chars).')
@secure()
param jwtSecret string

@description('Payment provider API keys.')
@secure()
param flutterwaveSecretKey string = ''

@secure()
param paystackSecretKey string = ''

@secure()
param ozowApiKey string = ''

@secure()
param peachBearerToken string = ''

var appName = '${namePrefix}-api'
var planName = '${namePrefix}-plan'
var dbName = '${namePrefix}-db'
var insightsName = '${namePrefix}-insights'

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: insightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource serverFarm 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
    size: 'B1'
    family: 'B'
    capacity: 1
  }
  properties: {
    reserved: true
  }
  kind: 'linux'
}

resource postgreSql 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: dbName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'payafrika_admin'
    administratorLoginPassword: dbPassword
    version: '16'
    storage: {
      storageSizeGB: 32
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource dbFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgreSql
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: serverFarm.id
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|10.0'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
        { name: 'ASPNETCORE_URLS', value: 'http://+:8080' }
        { name: 'ConnectionStrings__DefaultConnection', value: 'Host=${postgreSql.name}.postgres.database.azure.com;Database=payafrika;Username=payafrika_admin;Password=${dbPassword};SSL Mode=Require' }
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
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'Cors__AllowedOrigins', value: '["https://payafrika.vercel.app","https://www.payafrika.vercel.app"]' }
      ]
    }
    httpsOnly: true
  }
}

output appUrl string = 'https://${appService.properties.defaultHostName}'
output dbHost string = '${postgreSql.name}.postgres.database.azure.com'
