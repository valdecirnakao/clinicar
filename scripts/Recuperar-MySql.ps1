param([switch]$Aplicar)
. (Join-Path $PSScriptRoot 'DockerHelpers.ps1')
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not $Aplicar) {
    Write-Host 'Este script sincroniza as contas root@localhost e clinicar_app com o .env atual.'
    Write-Host 'Antes disso, para o banco e faz uma copia fisica integral verificada.'
    Write-Host 'Leia documentacao/recuperacao-ambiente.md e execute com -Aplicar.'
    exit 0
}

$recoveryName = $null
$backupName = $null
$originalMysql = $null
$backupPath = $null
$backupVerified = $false
$policyChanged = $false
Push-Location $projectRoot
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Comando docker ausente. Abra o Docker Desktop.' }
    $config = Get-ClinicarComposeConfig -ProjectRoot $projectRoot
    $rootPassword = [string]$config.services.mysql.environment.MYSQL_ROOT_PASSWORD
    $appPassword = [string]$config.services.mysql.environment.MYSQL_PASSWORD
    if ([string]::IsNullOrWhiteSpace($rootPassword) -or [string]::IsNullOrWhiteSpace($appPassword)) {
        throw 'Defina as duas senhas de MySQL no .env antes de recuperar.'
    }
    foreach ($nome in @('MYSQL_ROOT_PASSWORD', 'MYSQL_APP_PASSWORD')) {
        if (Test-Path "Env:$nome") { throw "Remova $nome da sessao PowerShell antes de recuperar; use somente o .env." }
    }
    $originalMysql = Get-ClinicarContainer -Name 'clinicar-mysql'
    if ($originalMysql.Config.Labels.'com.docker.compose.project' -ne $config.name -or
        $originalMysql.Config.Labels.'com.docker.compose.service' -ne 'mysql') {
        throw 'O container clinicar-mysql nao pertence ao Compose deste projeto. Nenhuma alteracao foi feita.'
    }
    $mounts = @($originalMysql.Mounts | Where-Object { $_.Destination -eq '/var/lib/mysql' })
    if ($mounts.Count -ne 1 -or $mounts[0].Type -ne 'volume') {
        throw 'Esta recuperacao exige um volume Docker em /var/lib/mysql; nao continue em outro tipo de montagem.'
    }
    $volume = [string]$mounts[0].Name
    $image = [string]$originalMysql.Image # ID imutavel da imagem que abriu este banco.
    $toolsImage = 'busybox:1.37.0'
    # Obtenha as ferramentas ANTES de parar o banco. A imagem MySQL pode nao ter tar.
    $tools = Invoke-ClinicarDocker -Arguments @('image', 'inspect', $toolsImage) -AllowFailure
    if ($tools.Code -ne 0) {
        Write-Host 'Preparando a imagem pequena usada para copiar e verificar o backup...'
        Invoke-ClinicarDocker -Arguments @('pull', $toolsImage) -Etapa 'download das ferramentas de backup' | Out-Null
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupDir = Join-Path $projectRoot 'backup'
    New-Item -ItemType Directory -Force $backupDir | Out-Null
    $backupPath = Join-Path $backupDir "mysql-volume-antes-recuperacao-$stamp.tgz"
    $backupName = "clinicar-copia-$stamp"
    $recoveryName = "clinicar-recuperacao-$stamp"

    Write-Host '1/6 Parando frontend, backend e MySQL para copiar um banco consistente...'
    Invoke-ClinicarDocker -Arguments @('compose', '--env-file', '.env', '-f', 'compose.yaml', '-f', 'compose.dev.yaml', 'stop', 'frontend', 'backend') -Etapa 'parada da aplicacao' | Out-Null
    # Evita que o servidor original reinicie enquanto o auxiliar usa o volume.
    Invoke-ClinicarDocker -Arguments @('update', '--restart=no', 'clinicar-mysql') -Etapa 'suspensao do reinicio automatico' | Out-Null
    $policyChanged = $true
    Invoke-ClinicarDocker -Arguments @('stop', '--time', '60', 'clinicar-mysql') -Etapa 'parada do MySQL' | Out-Null
    $stopped = Get-ClinicarContainer -Name 'clinicar-mysql'
    if ($stopped.State.Running -or $stopped.State.ExitCode -ne 0) {
        throw 'MySQL nao encerrou normalmente. A recuperacao foi interrompida antes de alterar as contas.'
    }
    $writers = Invoke-ClinicarDocker -Arguments @('ps', '-q', '--filter', "volume=$volume") -Etapa 'verificacao de outros usuarios do volume'
    if (-not [string]::IsNullOrWhiteSpace($writers.Text)) { throw 'Outro container esta usando o volume. Nenhuma conta foi alterada.' }

    Write-Host '2/6 Fazendo backup fisico integral com o volume montado somente para leitura...'
    Invoke-ClinicarDocker -Arguments @('run', '--name', $backupName, '--network', 'none', '--user', '0', '--mount', "type=volume,source=$volume,target=/var/lib/mysql,readonly", '--entrypoint', 'tar', $toolsImage, '-C', '/var/lib/mysql', '-czf', '/tmp/clinicar-dados.tgz', '.') -Etapa 'copia fisica do volume' | Out-Null
    Invoke-ClinicarDocker -Arguments @('cp', "${backupName}:/tmp/clinicar-dados.tgz", $backupPath) -Etapa 'copia do backup para Windows' | Out-Null
    if (-not (Test-Path $backupPath) -or (Get-Item $backupPath).Length -lt 1024) {
        throw 'Backup ausente ou muito pequeno. As contas nao foram alteradas.'
    }
    # Verifique o backup local antes de qualquer alteracao nas contas.
    $checkName = "clinicar-verifica-$stamp"
    try {
        Invoke-ClinicarDocker -Arguments @('run', '-d', '--name', $checkName, '--network', 'none', '--entrypoint', 'sleep', $toolsImage, '86400') -Etapa 'inicio do verificador de backup' | Out-Null
        Invoke-ClinicarDocker -Arguments @('cp', $backupPath, "${checkName}:/tmp/clinicar-dados.tgz") -Etapa 'verificacao do backup local' | Out-Null
        Invoke-ClinicarDocker -Arguments @('exec', $checkName, 'tar', '-tzf', '/tmp/clinicar-dados.tgz') -Etapa 'integridade do arquivo de backup' | Out-Null
        $hash = Invoke-ClinicarDocker -Arguments @('exec', $checkName, 'sha256sum', '/tmp/clinicar-dados.tgz') -Etapa 'checksum do backup'
        $localHash = (Get-FileHash $backupPath -Algorithm SHA256).Hash
        if (($hash.Text -split '\s+')[0] -ine $localHash) { throw 'Checksum do backup nao corresponde.' }
        $backupVerified = $true
        Write-Host "Backup verificado: $backupPath"
    } finally {
        Invoke-ClinicarDocker -Arguments @('rm', '-f', '-v', $checkName) -AllowFailure | Out-Null
    }
    Invoke-ClinicarDocker -Arguments @('rm', '-v', $backupName) -Etapa 'limpeza do auxiliar de copia' | Out-Null
    $backupName = $null

    Write-Host '3/6 Abrindo recuperacao isolada, sem rede e sem portas publicadas...'
    Invoke-ClinicarDocker -Arguments @('run', '-d', '--name', $recoveryName, '--network', 'none', '--mount', "type=volume,source=$volume,target=/var/lib/mysql", $image, '--skip-grant-tables', '--skip-networking', '--general-log=0', '--slow-query-log=0') -Etapa 'inicio do MySQL de recuperacao' | Out-Null
    $ready = $false
    for ($tentativa = 0; $tentativa -lt 60; $tentativa++) {
        $r = Invoke-ClinicarDocker -Arguments @('exec', '-i', $recoveryName, 'mysql', '--protocol=socket', '-uroot', '--batch', '--skip-column-names') -InputText 'SELECT 1;' -AllowFailure
        if ($r.Code -eq 0 -and $r.Text.Trim() -eq '1') { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'MySQL de recuperacao nao ficou pronto. O backup foi preservado.' }
    $accounts = Invoke-ClinicarDocker -Arguments @('exec', '-i', $recoveryName, 'mysql', '--protocol=socket', '-uroot', '--batch', '--skip-column-names') -InputText "SELECT Host FROM mysql.user WHERE User='clinicar_app';" -Etapa 'leitura dos hosts da conta app'
    $rootExists = Invoke-ClinicarDocker -Arguments @('exec', '-i', $recoveryName, 'mysql', '--protocol=socket', '-uroot', '--batch', '--skip-column-names') -InputText "SELECT COUNT(*) FROM mysql.user WHERE User='root' AND Host='localhost';" -Etapa 'verificacao da conta root'
    if ($rootExists.Text.Trim() -ne '1') { throw 'A conta root@localhost nao existe. Recuperacao interrompida para analise.' }

    Write-Host '4/6 Sincronizando as senhas com o .env, sem alterar tabelas da aplicacao...'
    $rootSql = ConvertTo-ClinicarSqlLiteral -Value $rootPassword
    $appSql = ConvertTo-ClinicarSqlLiteral -Value $appPassword
    $statements = New-Object System.Collections.Generic.List[string]
    $statements.Add("FLUSH PRIVILEGES;")
    $statements.Add("SET SESSION sql_mode='';")
    $statements.Add("ALTER USER 'root'@'localhost' IDENTIFIED BY $rootSql ACCOUNT UNLOCK;")
    $statements.Add("CREATE USER IF NOT EXISTS 'clinicar_app'@'%' IDENTIFIED BY $appSql;")
    $hosts = @('%') + @($accounts.Text -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object { $_.Trim() })
    foreach ($hostName in ($hosts | Select-Object -Unique)) {
        $hostSql = ConvertTo-ClinicarSqlLiteral -Value $hostName
        $statements.Add("ALTER USER 'clinicar_app'@$hostSql IDENTIFIED BY $appSql ACCOUNT UNLOCK;")
        $statements.Add("GRANT ALL PRIVILEGES ON ``clinicar``.* TO 'clinicar_app'@$hostSql;")
    }
    Invoke-ClinicarDocker -Arguments @('exec', '-i', $recoveryName, 'mysql', '--protocol=socket', '-uroot', '--default-character-set=utf8mb4', '--batch') -InputText ($statements -join "`n") -Etapa 'sincronizacao das contas do banco' | Out-Null
    $statements.Clear(); $rootSql = $null; $appSql = $null

    Write-Host '5/6 Encerrando recuperacao e recriando somente o container MySQL...'
    Invoke-ClinicarDocker -Arguments @('stop', '--time', '60', $recoveryName) -Etapa 'parada do servidor auxiliar' | Out-Null
    $auxStopped = Get-ClinicarContainer -Name $recoveryName
    if ($auxStopped.State.Running -or $auxStopped.State.ExitCode -ne 0) { throw 'Servidor auxiliar nao encerrou normalmente; nao inicie outro MySQL.' }
    Invoke-ClinicarDocker -Arguments @('rm', '-v', $recoveryName) -Etapa 'remocao do container auxiliar' | Out-Null
    $recoveryName = $null
    Invoke-ClinicarDocker -Arguments @('compose', '--env-file', '.env', '-f', 'compose.yaml', '-f', 'compose.dev.yaml', 'up', '-d', '--no-deps', '--force-recreate', 'mysql') -Etapa 'reinicio normal do banco' | Out-Null
    $policyChanged = $false # O Compose restaurou restart: unless-stopped no container novo.
    $healthy = $false
    for ($tentativa = 0; $tentativa -lt 90; $tentativa++) {
        $c = Get-ClinicarContainer -Name 'clinicar-mysql'
        if ($c.State.PSObject.Properties.Name -contains 'Health' -and $c.State.Health.Status -eq 'healthy') { $healthy = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $healthy -or -not (Test-ClinicarMysql -Name 'clinicar-mysql' -Account root) -or -not (Test-ClinicarMysql -Name 'clinicar-mysql' -Account app)) {
        throw 'A verificacao final do MySQL nao passou. A aplicacao permanece parada; execute Diagnosticar-CliniCar.ps1.'
    }
    Write-Host '6/6 MySQL healthy; autenticacoes root e app confirmadas.'
    Write-Host 'Agora reconstrua backend e frontend seguindo documentacao/recuperacao-ambiente.md. O backup foi mantido.'
} catch {
    Write-Host ('RECUPERACAO INTERROMPIDA: ' + $_.Exception.Message)
    if ($backupVerified) { Write-Host "Backup preservado: $backupPath" }
    if ($backupName) { Write-Host "Auxiliar de copia preservado para diagnostico: $backupName" }
    throw
} finally {
    # Nunca deixe um servidor com autenticacao desabilitada em execucao.
    $auxClean = $true
    if ($recoveryName) {
        $stop = Invoke-ClinicarDocker -Arguments @('stop', '--time', '60', $recoveryName) -AllowFailure
        if ($stop.Code -eq 0) {
            Invoke-ClinicarDocker -Arguments @('rm', '-v', $recoveryName) -AllowFailure | Out-Null
        } else {
            $auxClean = $false
            Write-Host "ATENCAO: confira docker ps -a. Nao inicie clinicar-mysql enquanto $recoveryName estiver rodando."
        }
    }
    if ($policyChanged -and $originalMysql -and $auxClean) {
        $restart = [string]$originalMysql.HostConfig.RestartPolicy.Name
        if ([string]::IsNullOrWhiteSpace($restart)) { $restart = 'no' }
        if ($restart -eq 'on-failure' -and $originalMysql.HostConfig.RestartPolicy.MaximumRetryCount -gt 0) {
            $restart += ':' + $originalMysql.HostConfig.RestartPolicy.MaximumRetryCount
        }
        Invoke-ClinicarDocker -Arguments @('update', "--restart=$restart", 'clinicar-mysql') -AllowFailure | Out-Null
    }
    $rootPassword = $null; $appPassword = $null; $config = $null
    Pop-Location
}
