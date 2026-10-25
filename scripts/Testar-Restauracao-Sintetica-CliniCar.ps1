# Ensaio de ponta a ponta com dados e senha sintéticos em MySQL descartável.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CliniCarBackupCrypto.ps1')
$senha = ConvertTo-SecureString 'senha-sintetica-apenas-para-teste' -AsPlainText -Force
$arquivo = Join-Path ([IO.Path]::GetTempPath()) ('clinicar-ensaio-' + [Guid]::NewGuid().ToString('N') + '.ccbak')
$texto = [Text.StringBuilder]::new()
for ($tabela = 1; $tabela -le 44; $tabela++) {
    [void]$texto.AppendLine("CREATE TABLE ensaio_backup_$tabela (id INT PRIMARY KEY, valor VARCHAR(20));")
    for ($i = 1; $i -le 60; $i++) {
        [void]$texto.AppendLine("INSERT INTO ensaio_backup_$tabela VALUES ($i, 'sintetico');")
    }
}
$entrada = [IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes($texto.ToString()))
$saida = [IO.File]::Open($arquivo, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
try {
    [void](Protect-ClinicarBackupStream -Entrada $entrada -Saida $saida -Senha $senha)
} finally {
    $entrada.Dispose()
    $saida.Dispose()
}
try {
    $hash = (Get-FileHash -LiteralPath $arquivo -Algorithm SHA256).Hash
    "$hash  $(Split-Path $arquivo -Leaf)" | Set-Content -LiteralPath ($arquivo + '.sha256') -Encoding ascii
    & (Join-Path $PSScriptRoot 'Testar-Restauracao-CliniCar.ps1') -Arquivo $arquivo -Senha $senha
} finally {
    Remove-Item -LiteralPath $arquivo, ($arquivo + '.sha256') -Force -ErrorAction SilentlyContinue
}
