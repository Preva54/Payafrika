FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder
WORKDIR /app

COPY PayAfrika.API/PayAfrika.API.csproj ./PayAfrika.API/
RUN dotnet restore ./PayAfrika.API/PayAfrika.API.csproj

COPY . .
RUN dotnet publish ./PayAfrika.API/PayAfrika.API.csproj -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runner
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=builder /app/out .

EXPOSE 8080

CMD ["dotnet", "PayAfrika.API.dll"]
