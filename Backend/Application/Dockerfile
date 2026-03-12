FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY . .

RUN dotnet restore Backend/Application.sln
RUN dotnet publish Backend/Application.sln -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:3.1
WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Application.dll"]