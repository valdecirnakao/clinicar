$ErrorActionPreference = 'Stop'
$nomeTarefa = 'CliniCar - Backup diario do banco'
$arquivoStatus = Join-Path $env:LOCALAPPDATA 'CliniCar\Backup\ultimo-resultado.json'
$tarefa = Get-ScheduledTask -TaskName $nomeTarefa -ErrorAction SilentlyContinue
if (-not $tarefa) { throw 'A tarefa automática do CliniCar ainda não foi registrada.' }
$informacoes = Get-ScheduledTaskInfo -TaskName $nomeTarefa
Write-Host "Tarefa: $($tarefa.State) | próxima execução: $($informacoes.NextRunTime) | último código: $($informacoes.LastTaskResult)"
if (-not (Test-Path -LiteralPath $arquivoStatus -PathType Leaf)) {
    throw 'A tarefa ainda não registrou resultado. Confira-a novamente após a execução de teste.'
}
$status = Get-Content -LiteralPath $arquivoStatus -Raw | ConvertFrom-Json
Write-Host "Resultado: $($status.situacao) em $($status.dataHora)"
Write-Host $status.mensagem
if ($status.arquivo) { Write-Host "Arquivo: $($status.arquivo)" }
if ($status.situacao -notin @('sucesso', 'ja_executado')) { exit 1 }
