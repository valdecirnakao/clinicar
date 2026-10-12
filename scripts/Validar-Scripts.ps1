# Valida sintaxe com o parser PowerShell instalado. Nao usa Docker ou o banco.
$ErrorActionPreference = 'Stop'
$falhou = $false
foreach ($arquivo in (Get-ChildItem $PSScriptRoot -Filter '*.ps1' -File)) {
    $tokens = $null
    $erros = $null
    [System.Management.Automation.Language.Parser]::ParseFile($arquivo.FullName, [ref]$tokens, [ref]$erros) | Out-Null
    if ($erros.Count -gt 0) {
        $falhou = $true
        foreach ($erro in $erros) {
            Write-Host ($arquivo.Name + ': linha ' + $erro.Extent.StartLineNumber + ' - ' + $erro.Message)
        }
    } else { Write-Host ($arquivo.Name + ': sintaxe OK') }
}
if ($falhou) { throw 'Nao execute a recuperacao: ha erro de sintaxe nos scripts.' }
. (Join-Path $PSScriptRoot 'DockerHelpers.ps1')
# Verifique casos importantes para nao interpolar aspas/barras em SQL de senhas.
$casos = @(
    @{ Entrada = 'abc'; Esperado = "'abc'" },
    @{ Entrada = "a'b"; Esperado = "'a\'b'" },
    @{ Entrada = 'a\b'; Esperado = "'a\\b'" },
    @{ Entrada = "a`nb"; Esperado = "'a\nb'" }
)
foreach ($caso in $casos) {
    if ((ConvertTo-ClinicarSqlLiteral -Value $caso.Entrada) -cne $caso.Esperado) {
        throw 'Conversao de literais SQL falhou. Nao execute a recuperacao.'
    }
}
Write-Host 'Validacao de sintaxe e escape SQL concluida. Isto nao executa a recuperacao.'
