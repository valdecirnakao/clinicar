# Executado pelo Agendador de Tarefas na sessão do usuário que configurou o backup.
$ErrorActionPreference = 'Stop'
$pastaLocal = Join-Path $env:LOCALAPPDATA 'CliniCar\Backup'
$arquivoConfiguracao = Join-Path $pastaLocal 'configuracao.json'
$arquivoSenha = Join-Path $pastaLocal 'senha.clixml'
$arquivoStatus = Join-Path $pastaLocal 'ultimo-resultado.json'

function Salvar-StatusBackup {
    param([string]$Situacao, [string]$Mensagem, [string]$Arquivo = '')
    [ordered]@{
        dataHora = (Get-Date).ToString('o')
        situacao = $Situacao
        mensagem = $Mensagem
        arquivo = $Arquivo
    } | ConvertTo-Json | Set-Content -LiteralPath $arquivoStatus -Encoding utf8
}

try {
    if (-not (Test-Path -LiteralPath $arquivoConfiguracao -PathType Leaf) -or
        -not (Test-Path -LiteralPath $arquivoSenha -PathType Leaf)) {
        throw 'Configuração ou senha protegida ausente. Execute o configurador novamente.'
    }
    $configuracao = Get-Content -LiteralPath $arquivoConfiguracao -Raw | ConvertFrom-Json
    $senha = Import-Clixml -LiteralPath $arquivoSenha
    if ($senha -isnot [Security.SecureString] -or $senha.Length -lt 12) {
        throw 'A senha protegida não pôde ser recuperada por este usuário do Windows.'
    }
    $pastaBase = [IO.Path]::GetFullPath([string]$configuracao.pastaBase)
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker não encontrado para executar o backup.'
    }

    # No logon, Drive e Docker Desktop podem levar alguns minutos para iniciar.
    $disponivel = $false
    for ($tentativa = 0; $tentativa -lt 60; $tentativa++) {
        if (Test-Path -LiteralPath $pastaBase -PathType Container) {
            $saude = docker inspect clinicar-mysql --format '{{.State.Health.Status}}' 2>$null
            if ($LASTEXITCODE -eq 0 -and $saude -eq 'healthy') { $disponivel = $true; break }
        }
        Start-Sleep -Seconds 10
    }
    if (-not $disponivel) { throw 'Google Drive ou MySQL do CliniCar indisponível após 10 minutos.' }

    $agora = Get-Date
    $pastaAno = Join-Path $pastaBase $agora.ToString('yyyy')
    $destino = Join-Path $pastaAno $agora.ToString('MM')
    [void](New-Item -ItemType Directory -Path $destino -Force)

    # O gatilho no logon recupera dias perdidos; se já houver cópia válida hoje, evita duplicá-la.
    $prefixo = 'clinicar-' + $agora.ToString('yyyyMMdd') + '-'
    $copiasHoje = Get-ChildItem -LiteralPath $destino -File -Filter ($prefixo + '*.ccbak') |
        Sort-Object LastWriteTime -Descending
    foreach ($copia in $copiasHoje) {
        $manifesto = $copia.FullName + '.sha256'
        if (-not (Test-Path -LiteralPath $manifesto -PathType Leaf)) { continue }
        $esperado = ((Get-Content -LiteralPath $manifesto -TotalCount 1) -split '\s+')[0]
        if ($esperado -ieq (Get-FileHash -LiteralPath $copia.FullName -Algorithm SHA256).Hash) {
            Salvar-StatusBackup -Situacao 'ja_executado' -Mensagem 'Cópia íntegra já existente hoje.' -Arquivo $copia.FullName
            Write-Host 'Cópia íntegra já existente hoje; nenhuma nova cópia necessária.'
            exit 0
        }
    }

    $arquivoCriado = & (Join-Path $PSScriptRoot 'Backup-CliniCar.ps1') -Destino $destino -Senha $senha -PassThru
    if (-not $arquivoCriado -or -not (Test-Path -LiteralPath $arquivoCriado -PathType Leaf)) {
        throw 'O gerador não retornou um arquivo de backup válido.'
    }
    Salvar-StatusBackup -Situacao 'sucesso' -Mensagem 'Cópia criptografada criada e SHA-256 registrado.' -Arquivo $arquivoCriado
    Write-Host "Backup automático concluído: $arquivoCriado"
} catch {
    $mensagem = $_.Exception.Message
    Salvar-StatusBackup -Situacao 'falha' -Mensagem $mensagem
    Write-Error "Backup automático do CliniCar falhou: $mensagem"
    exit 1
} finally {
    $senha = $null
}
