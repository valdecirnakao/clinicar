param(
    [string]$UrlSaude = 'http://localhost/api/infra/health',
    [int]$LimitePendenciaMinutos = 30
)
$ErrorActionPreference = 'Stop'
if ($LimitePendenciaMinutos -lt 1) { throw 'O limite deve ser maior que zero.' }

try {
    $resposta = Invoke-WebRequest -Uri $UrlSaude -TimeoutSec 10 -UseBasicParsing
    if ($resposta.StatusCode -ne 200) { throw 'A aplicação não respondeu com HTTP 200.' }
    Write-Host 'Aplicação: acessível.'
} catch { throw 'Aplicação: indisponível ou sem resposta no prazo. Verifique o serviço web.' }

$inspecao = docker inspect clinicar-mysql --format '{{.State.Health.Status}}' 2>$null
if ($LASTEXITCODE -ne 0 -or $inspecao -ne 'healthy') {
    throw 'MySQL: contêiner ausente ou sem estado healthy.'
}
Write-Host 'MySQL: healthy.'

# Credenciais permanecem no contêiner; a consulta retorna somente contagens.
$consulta = @'
MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --batch --skip-column-names -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT COALESCE(SUM(estado IN ('ERRO','INDETERMINADO')),0), COALESCE(SUM(estado IN ('PENDENTE','TENTAR_NOVAMENTE') AND criado_em < DATE_SUB(NOW(), INTERVAL $1 MINUTE)),0) FROM notificacao_outbox"
'@
$contagens = docker exec clinicar-mysql sh -c $consulta.Replace('$1', [string]$LimitePendenciaMinutos) 2>$null
if ($LASTEXITCODE -ne 0 -or -not $contagens) { throw 'Não foi possível consultar o estado das notificações.' }
$valores = ($contagens | Select-Object -Last 1) -split "`t"
if ($valores.Count -ne 2) { throw 'Resposta inesperada ao consultar as notificações.' }
$falhas = [int]$valores[0]; $atrasadas = [int]$valores[1]
Write-Host "Notificações com falha ou resultado indeterminado: $falhas; pendentes há mais de $LimitePendenciaMinutos minutos: $atrasadas."
if ($falhas -gt 0 -or $atrasadas -gt 0) { throw 'Há notificações que exigem análise no painel administrativo.' }
