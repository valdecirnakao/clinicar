# Teste local com conteúdo e senha sintéticos. Não consulta Docker nem o banco do CliniCar.
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'CliniCarBackupCrypto.ps1')
$senha = ConvertTo-SecureString 'senha-sintetica-apenas-para-teste' -AsPlainText -Force
$senhaErrada = ConvertTo-SecureString 'outra-senha-sintetica-de-teste' -AsPlainText -Force
$dados = [Text.Encoding]::UTF8.GetBytes(("CREATE TABLE exemplo (id INT);`n" * 100000))
$origem = [IO.MemoryStream]::new($dados)
$destino = [IO.MemoryStream]::new()
try { $total = Protect-ClinicarBackupStream -Entrada $origem -Saida $destino -Senha $senha }
finally { $origem.Dispose() }
$cifrado = $destino.ToArray()
$destino.Dispose()
$recuperado = [IO.MemoryStream]::new()
try {
    $tamanho = Unprotect-ClinicarBackupStream -Entrada ([IO.MemoryStream]::new($cifrado)) -Saida $recuperado -Senha $senha
    if ($tamanho -ne $total -or -not [Linq.Enumerable]::SequenceEqual([byte[]]$dados, [byte[]]$recuperado.ToArray())) {
        throw 'O conteúdo recuperado não corresponde ao original.'
    }
} finally { $recuperado.Dispose() }
foreach ($caso in @('senha incorreta', 'arquivo alterado', 'arquivo truncado')) {
    $tentativa = [byte[]]$cifrado.Clone()
    $chave = $senha
    if ($caso -eq 'senha incorreta') { $chave = $senhaErrada }
    if ($caso -eq 'arquivo alterado') { $tentativa[100] = $tentativa[100] -bxor 1 }
    if ($caso -eq 'arquivo truncado') { $tentativa = $tentativa[0..($tentativa.Length - 15)] }
    $rejeitado = $false
    try { [void](Unprotect-ClinicarBackupStream -Entrada ([IO.MemoryStream]::new($tentativa)) -Saida ([IO.Stream]::Null) -Senha $chave) }
    catch { $rejeitado = $true }
    if (-not $rejeitado) { throw "O caso '$caso' foi aceito indevidamente." }
}
Write-Host 'Criptografia: recuperação correta e rejeição de senha errada, alteração e truncamento.'
