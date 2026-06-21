$server = "56759440.ssh.w1.strato.hosting"
$user = "stu512072182"
$port = 22
$webroot = "Seniorenclub"
$buildDir = "src\gratulationsdienst"
$sshOpt = "-o UpdateHostKeys=no"

Write-Host "Baue App..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build fehlgeschlagen." -ForegroundColor Red; exit 1 }

Write-Host "Lade Frontend hoch..." -ForegroundColor Cyan
scp -r -P $port $sshOpt "$buildDir\*" "${user}@${server}:${webroot}/gratulationsdienst/"

Write-Host "Lade PHP-API hoch..." -ForegroundColor Cyan
scp -P $port $sshOpt php-api/index.php php-api/schema.mysql.sql php-api/.htaccess "${user}@${server}:${webroot}/gratulationsdienst/php-api/"

Write-Host "Setze Dateirechte..." -ForegroundColor Cyan
ssh -p $port $sshOpt "${user}@${server}" "chmod -R u=rwX,go=rX Seniorenclub/gratulationsdienst"

Write-Host "Fertig! https://senioren-luebars.berlin/gratulationsdienst/" -ForegroundColor Green
