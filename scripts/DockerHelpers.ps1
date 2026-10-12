# Compatible com Windows PowerShell 5.1 e PowerShell 7.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)

function Invoke-ClinicarDocker {
    param(
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$InputText,
        [string]$Etapa = 'operacao Docker',
        [switch]$AllowFailure
    )
    # Capture toda a saida. config/inspect/SQL nunca sao impressos automaticamente.
    # Nao colocar senhas nos argumentos, nos erros ou no historico do terminal.
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        if ($PSBoundParameters.ContainsKey('InputText')) {
            $linhas = @($InputText | & docker @Arguments 2>&1)
        } else {
            $linhas = @(& docker @Arguments 2>&1)
        }
        $codigo = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $anterior
    }
    $resultado = [pscustomobject]@{
        Code = $codigo
        Text = (($linhas | ForEach-Object { $_.ToString() }) -join "`n")
    }
    if ($codigo -ne 0 -and -not $AllowFailure) {
        throw "Falha em: $Etapa (codigo $codigo). A saida foi ocultada para preservar credenciais."
    }
    return $resultado
}

function Get-ClinicarComposeConfig {
    param([string]$ProjectRoot)
    if (-not (Test-Path (Join-Path $ProjectRoot '.env'))) {
        throw 'Arquivo .env ausente. Preserve seu .env atual; nao copie senhas de exemplos.'
    }
    $r = Invoke-ClinicarDocker -Arguments @('compose', '--env-file', '.env', '-f', 'compose.yaml', '-f', 'compose.dev.yaml', 'config', '--format', 'json') -Etapa 'validacao do Compose e do .env'
    return ($r.Text | ConvertFrom-Json)
}

function Get-ClinicarContainer {
    param([string]$Name)
    $r = Invoke-ClinicarDocker -Arguments @('inspect', $Name) -Etapa "inspecao de $Name"
    $itens = @($r.Text | ConvertFrom-Json)
    return $itens[0]
}

function Get-ClinicarEnvironment {
    param($Container)
    $envMap = @{}
    foreach ($linha in $Container.Config.Env) {
        $partes = $linha -split '=', 2
        $envMap[$partes[0]] = $partes[1]
    }
    return $envMap
}

function Test-ClinicarMysql {
    param([string]$Name, [ValidateSet('root', 'app')][string]$Account)
    # O shell expande o segredo DENTRO do container, sem o passar por argumentos.
    if ($Account -eq 'root') {
        $shell = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --protocol=socket -uroot --batch --skip-column-names -e "SELECT 1;"'
    } else {
        $shell = 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" "$MYSQL_DATABASE" --batch --skip-column-names -e "SELECT 1;"'
    }
    $r = Invoke-ClinicarDocker -Arguments @('exec', '-i', $Name, 'sh') -InputText $shell -AllowFailure
    return ($r.Code -eq 0 -and $r.Text.Trim() -eq '1')
}

function ConvertTo-ClinicarSqlLiteral {
    param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)
    # Usado junto de SET SESSION sql_mode=''; cobre aspas, barras e controles.
    $v = $Value.Replace('\', '\\').Replace("'", "\'")
    $v = $v.Replace([string][char]0, '\0').Replace("`r", '\r').Replace("`n", '\n').Replace([string][char]26, '\Z')
    return "'$v'"
}
