. (Join-Path $PSScriptRoot 'DockerHelpers.ps1')
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Abra o Docker Desktop e disponibilize o comando docker.' }
    $config = Get-ClinicarComposeConfig -ProjectRoot $projectRoot
    foreach ($nome in @('clinicar-mysql', 'clinicar-backend', 'clinicar-frontend')) {
        $r = Invoke-ClinicarDocker -Arguments @('inspect', $nome) -AllowFailure
        if ($r.Code -ne 0) { Write-Host "$nome : ausente"; continue }
        $c = @($r.Text | ConvertFrom-Json)[0]
        $saude = 'sem healthcheck'
        if ($c.State.PSObject.Properties.Name -contains 'Health') { $saude = $c.State.Health.Status }
        Write-Host "$nome : $($c.State.Status), $saude"
        $e = Get-ClinicarEnvironment -Container $c
        if ($nome -eq 'clinicar-mysql') {
            Write-Host ('Senha app recebida corresponde ao Compose atual: ' + ($e['MYSQL_PASSWORD'] -ceq $config.services.mysql.environment.MYSQL_PASSWORD))
            Write-Host ('Senha root recebida corresponde ao Compose atual: ' + ($e['MYSQL_ROOT_PASSWORD'] -ceq $config.services.mysql.environment.MYSQL_ROOT_PASSWORD))
            if ($c.State.Running) {
                Write-Host ('Autenticacao app: ' + (Test-ClinicarMysql -Name $nome -Account app))
                Write-Host ('Autenticacao root: ' + (Test-ClinicarMysql -Name $nome -Account root))
            }
        }
        if ($nome -eq 'clinicar-backend') {
            Write-Host ('SMTP recebido: ' + $e['MAIL_HOST'] + ':' + $e['MAIL_PORT'])
            Write-Host ('SMTP do Compose atual: ' + $config.services.backend.environment.MAIL_HOST + ':' + $config.services.backend.environment.MAIL_PORT)
            Write-Host ('Senha datasource corresponde ao Compose atual: ' + ($e['SPRING_DATASOURCE_PASSWORD'] -ceq $config.services.backend.environment.SPRING_DATASOURCE_PASSWORD))
        }
    }
    foreach ($nome in @('MYSQL_ROOT_PASSWORD', 'MYSQL_APP_PASSWORD')) {
        if (Test-Path "Env:$nome") { Write-Host "ATENCAO: $nome esta definida na sessao e tem precedencia sobre .env." }
    }
    Write-Host 'Diagnostico concluido. Nenhum valor de senha ou token foi exibido.'
} finally { Pop-Location }
