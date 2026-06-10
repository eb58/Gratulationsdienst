$server = "56759440.ssh.w1.strato.hosting"
$user = "stu512072182"
$port = 22
$webroot = "Seniorenclub"
$buildDir = "..\..\docker-container\src\gratulationsdienst"

Write-Host "Baue App..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build fehlgeschlagen." -ForegroundColor Red; exit 1 }

Write-Host "Lade Frontend hoch..." -ForegroundColor Cyan
scp -r -P $port "$buildDir\*" "${user}@${server}:${webroot}/gratulationsdienst/"

Write-Host "Lade PHP-API hoch..." -ForegroundColor Cyan
scp -P $port php-api/index.php php-api/schema.mysql.sql php-api/.htaccess "${user}@${server}:${webroot}/php-api/"

Write-Host "Setze Dateirechte..." -ForegroundColor Cyan
$cmds = @(
    "chmod -R 755 ${webroot}/gratulationsdienst",
    "chmod -R 755 ${webroot}/php-api",
    "find ${webroot}/gratulationsdienst -type f -exec chmod 644 {} +"
) -join "`n"
echo $cmds | ssh -p $port "${user}@${server}" "bash -s"

Write-Host "Fertig! https://senioren-luebars.berlin/gratulationsdienst/" -ForegroundColor Green
