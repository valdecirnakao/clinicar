param([Parameter(Mandatory = $true)][string]$Destino, [Security.SecureString]$Senha,
      [switch]$PassThru)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CliniCarBackupCrypto.ps1')
$raiz = [IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$pasta = [IO.Path]::GetFullPath($Destino)
$dentroDoProjeto = $pasta.StartsWith($raiz + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
if ($dentroDoProjeto -or ($pasta.TrimEnd('\') -ieq $raiz.TrimEnd('\'))) {
    throw 'O destino do backup deve ficar fora da pasta do projeto.'
}
if (-not (Test-Path -LiteralPath $pasta -PathType Container)) { throw 'O destino não está disponível. Conecte o dispositivo ou a pasta de rede antes de executar.' }
$estado = docker inspect clinicar-mysql --format '{{.State.Health.Status}}' 2>$null
if ($LASTEXITCODE -ne 0 -or $estado -ne 'healthy') { throw 'O MySQL do CliniCar precisa estar healthy para esta cópia lógica.' }
if (-not $Senha) {
    if ([Console]::IsInputRedirected) { throw 'Informe a senha de recuperação por SecureString em execução interativa.' }
    $Senha = Read-Host 'Senha de recuperação do backup (guarde-a fora deste computador)' -AsSecureString
}
if (-not $Senha -or $Senha.Length -lt 12) { throw 'Use uma senha de recuperação com ao menos 12 caracteres.' }
$nome = 'clinicar-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.ccbak'
$final = Join-Path $pasta $nome
$temporario = $final + '.parcial'
$processo = $null
try {
    $inicio = [Diagnostics.ProcessStartInfo]::new('docker')
    foreach ($arg in @('exec', 'clinicar-mysql', 'sh', '-c',
            'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --single-transaction --quick --no-tablespaces --routines --triggers --events -u"$MYSQL_USER" "$MYSQL_DATABASE"')) {
        [void]$inicio.ArgumentList.Add($arg)
    }
    $inicio.UseShellExecute = $false
    $inicio.RedirectStandardOutput = $true
    $inicio.RedirectStandardError = $true
    $processo = [Diagnostics.Process]::Start($inicio)
    $erroPendente = $processo.StandardError.ReadToEndAsync()
    $arquivo = [IO.File]::Open($temporario, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try {
        $tamanhoOriginal = Protect-ClinicarBackupStream -Entrada $processo.StandardOutput.BaseStream -Saida $arquivo -Senha $Senha
    } finally { $arquivo.Dispose() }
    $processo.WaitForExit()
    $erro = $erroPendente.GetAwaiter().GetResult()
    if ($processo.ExitCode -ne 0 -or $erro -match '(?im)^mysqldump:\s*(?:Error|Got error):') {
        throw 'Falha ao criar a cópia lógica. O mysqldump relatou um erro; nenhum backup foi aceito.'
    }
    if ($tamanhoOriginal -lt 1024) { throw 'Cópia inesperadamente pequena; arquivo descartado.' }
    Move-Item -LiteralPath $temporario -Destination $final
    $hash = (Get-FileHash -LiteralPath $final -Algorithm SHA256).Hash
    "$hash  $nome" | Set-Content -LiteralPath ($final + '.sha256') -Encoding ascii
    Write-Host "Backup criptografado criado: $final"
    Write-Host "SHA-256: $hash"
    if ($PassThru) { Write-Output $final }
} finally {
    if ($processo) {
        if (-not $processo.HasExited) { $processo.Kill($true) }
        $processo.Dispose()
    }
    if (Test-Path -LiteralPath $temporario) { Remove-Item -LiteralPath $temporario -Force }
}
