param([Parameter(Mandatory = $true)][string]$Arquivo,
      [string]$ImagemMySql = 'clinicar-mysql:dev',
      [Security.SecureString]$Senha)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CliniCarBackupCrypto.ps1')
if (-not $Senha) {
    if ([Console]::IsInputRedirected) { throw 'Informe a senha de recuperação por SecureString em execução interativa.' }
    $Senha = Read-Host 'Senha de recuperação do backup' -AsSecureString
}
$origem = (Resolve-Path -LiteralPath $Arquivo).Path
if ((Get-Item -LiteralPath $origem).Length -lt 1024) { throw 'Arquivo de backup inválido ou incompleto.' }
$manifesto = $origem + '.sha256'
if (-not (Test-Path -LiteralPath $manifesto)) { throw 'Manifesto SHA-256 do backup não encontrado.' }
$esperado = ((Get-Content -LiteralPath $manifesto -TotalCount 1) -split '\s+')[0]
$atual = (Get-FileHash -LiteralPath $origem -Algorithm SHA256).Hash
if ($esperado -ine $atual) { throw 'O SHA-256 do backup não corresponde ao manifesto.' }
$entrada = [IO.File]::OpenRead($origem)
try {
    $tamanhoOriginal = Unprotect-ClinicarBackupStream -Entrada $entrada -Saida ([IO.Stream]::Null) -Senha $Senha
    if ($tamanhoOriginal -lt 1024) { throw 'Conteúdo restaurado inesperadamente pequeno.' }
} finally { $entrada.Dispose() }
$nome = 'clinicar-restauracao-' + [Guid]::NewGuid().ToString('N').Substring(0, 12)
try {
    # Contêiner descartável, sem portas e sem rede: nunca aponta para o banco operacional.
    docker run -d --name $nome --network none --env MYSQL_ALLOW_EMPTY_PASSWORD=yes --env MYSQL_DATABASE=clinicar_teste $ImagemMySql | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível iniciar o MySQL descartável de teste.' }
    $pronto = $false
    for ($i = 0; $i -lt 90; $i++) {
        # O servidor temporário responde pelo socket e é desligado durante a inicialização.
        # A rede deste contêiner está desativada, portanto aguardamos o marcador do
        # entrypoint antes de aceitar a resposta pelo socket do servidor definitivo.
        $inicializacao = docker logs --tail 80 $nome 2>&1 | Out-String
        if ($inicializacao -match 'MySQL init process done\. Ready for start up\.') {
            docker exec $nome mysqladmin ping -uroot --silent 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) { $pronto = $true; break }
        }
        Start-Sleep -Seconds 2
    }
    if (-not $pronto) { throw 'O MySQL descartável não iniciou dentro do prazo.' }
    docker exec $nome mysql -uroot -e 'CREATE DATABASE IF NOT EXISTS clinicar_teste' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar o banco descartável de restauração.' }
    $inicio = [Diagnostics.ProcessStartInfo]::new('docker')
    foreach ($arg in @('exec', '-i', $nome, 'mysql', '-uroot', 'clinicar_teste')) {
        [void]$inicio.ArgumentList.Add($arg)
    }
    $inicio.UseShellExecute = $false
    $inicio.RedirectStandardInput = $true
    $inicio.RedirectStandardOutput = $true
    $inicio.RedirectStandardError = $true
    $processo = [Diagnostics.Process]::Start($inicio)
    try {
        $saidaPendente = $processo.StandardOutput.ReadToEndAsync()
        $erroPendente = $processo.StandardError.ReadToEndAsync()
        $entrada = [IO.File]::OpenRead($origem)
        try { [void](Unprotect-ClinicarBackupStream -Entrada $entrada -Saida $processo.StandardInput.BaseStream -Senha $Senha) }
        finally { $entrada.Dispose(); $processo.StandardInput.Close() }
        $processo.WaitForExit()
        [void]$saidaPendente.GetAwaiter().GetResult()
        $erroImportacao = $erroPendente.GetAwaiter().GetResult()
        if ($processo.ExitCode -ne 0) {
            $estadoBruto = docker inspect $nome --format '{{.State.Running}}|{{.State.OOMKilled}}|{{.State.ExitCode}}' 2>$null
            $partes = [string]$estadoBruto -split '\|'
            $estadoServidor = if ($partes.Length -eq 3) {
                if ($partes[1] -eq 'true') { 'contêiner encerrado por falta de memória' }
                elseif ($partes[0] -eq 'true') {
                    docker exec $nome mysqladmin ping -uroot --silent 2>$null | Out-Null
                    if ($LASTEXITCODE -eq 0) { 'servidor ainda responde' } else { 'contêiner ativo, servidor sem resposta' }
                } else { "contêiner encerrado (código $($partes[2]))" }
            } else { 'estado do contêiner indisponível' }
            $logs = (docker logs --tail 60 $nome 2>&1 | Out-String)
            $sinal = if ($logs -match '(?i)out of memory|oom-kill|cannot allocate memory') { 'indício de falta de memória' }
                elseif ($logs -match '(?i)no space left|disk is full') { 'indício de falta de espaço' }
                elseif ($logs -match '(?i)got signal|assertion failure') { 'indício de falha do processo MySQL' }
                else { 'sem causa identificada nos registros recentes' }
            $codigo = [regex]::Match($erroImportacao, 'ERROR\s+(\d+)(?:\s+\([^)]+\))?(?:\s+at line\s+(\d+))?')
            if ($codigo.Success) {
                $linha = if ($codigo.Groups[2].Success) { ", linha $($codigo.Groups[2].Value)" } else { '' }
                throw "A restauração falhou no MySQL descartável (erro $($codigo.Groups[1].Value)$linha; $estadoServidor; $sinal)."
            }
            throw "A restauração falhou no MySQL descartável (código de saída $($processo.ExitCode); $estadoServidor; $sinal)."
        }
    } finally {
        if (-not $processo.HasExited) { $processo.Kill($true) }
        $processo.Dispose()
    }
    $tabelas = docker exec $nome mysql --batch --skip-column-names -uroot clinicar_teste -e 'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema="clinicar_teste"' 2>$null
    if ($LASTEXITCODE -ne 0 -or [int]$tabelas -lt 1) { throw 'A restauração não produziu tabelas verificáveis.' }
    Write-Host "Restauração de teste concluída em banco descartável: $tabelas tabelas verificadas."
} finally {
    docker rm -f $nome 2>$null | Out-Null
}
