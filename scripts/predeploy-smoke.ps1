param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [Parameter(Mandatory = $false)]
    [string]$WorkingDirectory
  )

  if ($WorkingDirectory) {
    Push-Location -LiteralPath $WorkingDirectory
  }

  try {
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code ${LASTEXITCODE}: $Command"
    }
  } finally {
    if ($WorkingDirectory) {
      Pop-Location
    }
  }
}

function Assert-StatusCode {
  param(
    [int]$Actual,
    [int]$Expected,
    [string]$Label
  )

  if ($Actual -ne $Expected) {
    throw "$Label failed. Expected status $Expected but got $Actual."
  }
}

Set-Location -LiteralPath $RepoRoot

$existingApi = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($existingApi) {
  Stop-Process -Id $existingApi.OwningProcess -Force
}

Invoke-CheckedCommand -Command "docker compose -f infra/docker-compose.yml up -d"

Set-Location -LiteralPath (Join-Path $RepoRoot "services/api")
Invoke-CheckedCommand -Command "pnpm db:migrate -- --name smoke"
Invoke-CheckedCommand -Command "pnpm db:seed"
Invoke-CheckedCommand -Command "pnpm build"

$apiProcess = Start-Process -FilePath "node" -ArgumentList "dist/main.js" -PassThru
Start-Sleep -Seconds 5

try {
  $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
  Assert-StatusCode -Actual $healthResponse.StatusCode -Expected 200 -Label "Health check"

  $docsResponse = Invoke-WebRequest -Uri "http://localhost:3001/docs" -UseBasicParsing
  Assert-StatusCode -Actual $docsResponse.StatusCode -Expected 200 -Label "Swagger check"

  $rand = Get-Random -Minimum 100000 -Maximum 999999
  $signupPayload = @{
    fullName = "Smoke User"
    fatherName = "Smoke Father"
    cnic = "12345-$rand-1"
    phone = "+923001$rand"
    email = "smoke.$rand@example.com"
    password = "SmokePass123!"
    city = "Karachi"
    dateOfBirth = "2000-01-01"
    gender = "MALE"
  } | ConvertTo-Json

  $signupResponse = Invoke-WebRequest `
    -Uri "http://localhost:3001/auth/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body $signupPayload `
    -UseBasicParsing
  Assert-StatusCode -Actual $signupResponse.StatusCode -Expected 201 -Label "Auth signup"

  $feedResponse = Invoke-WebRequest -Uri "http://localhost:3001/listings/feed" -UseBasicParsing
  Assert-StatusCode -Actual $feedResponse.StatusCode -Expected 200 -Label "Listings feed"

  Write-Host "Smoke passed: health/docs/auth/listings checks are successful."
} finally {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force
  }
}
