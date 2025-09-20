# Script simple para crear repositorio GitHub
Write-Host "=== Creador de Repositorio GitHub - ProFitAgent ===" -ForegroundColor Green
Write-Host ""
Write-Host "Instrucciones para crear el repositorio privado:"
Write-Host "1. Ve a: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "2. Haz clic en 'Generate new token (classic)'" -ForegroundColor Cyan
Write-Host "3. Nombre: 'ProFitAgent Repository Creation'" -ForegroundColor Cyan
Write-Host "4. Selecciona el scope 'repo'" -ForegroundColor Cyan
Write-Host "5. Copia el token generado" -ForegroundColor Cyan
Write-Host ""

$token = Read-Host "Ingresa tu Personal Access Token"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "❌ Token requerido" -ForegroundColor Red
    exit 1
}

Write-Host "Creando repositorio público 'profitagent-platform'..." -ForegroundColor Yellow

$command = "curl -H `"Authorization: token $token`" -d '{`"name`":`"profitagent-platform`",`"private`":false,`"description`":`"ProFitAgent - Plataforma de arbitraje y surebet automatizado con IA`"}' https://api.github.com/user/repos"

Invoke-Expression $command

Write-Host ""
Write-Host "Si el repositorio se creó exitosamente, ahora puedes hacer push:" -ForegroundColor Green
Write-Host "git push -u origin main" -ForegroundColor White
Write-Host ""
Read-Host "Presiona Enter para continuar"