param(
    [string]$PastaBase = 'G:\My Drive\CliniCar\Backups-Banco-de-Dados',
    [string]$Horario = '20:00'
)
$ErrorActionPreference = 'Stop'
$nomeTarefa = 'CliniCar - Backup diario do banco'
$executavel = 'C:\Program Files\PowerShell\7\pwsh.exe'
$pastaLocal = Join-Path $env:LOCALAPPDATA 'CliniCar\Backup'
$pastaScripts = Join-Path $pastaLocal 'scripts'
$executor = Join-Path $pastaScripts 'Executar-Backup-Agendado-CliniCar.ps1'
$arquivoConfiguracao = Join-Path $pastaLocal 'configuracao.json'
$arquivoSenha = Join-Path $pastaLocal 'senha.clixml'

if (-not (Test-Path -LiteralPath $executavel -PathType Leaf)) {
    throw 'Instale o PowerShell 7 oficial antes de configurar a tarefa automática.'
}
$pastaBaseAbsoluta = [IO.Path]::GetFullPath($PastaBase)
if (-not (Test-Path -LiteralPath $pastaBaseAbsoluta -PathType Container)) {
    throw 'A pasta base do Google Drive não está disponível.'
}
$hora = [DateTime]::MinValue
if (-not [DateTime]::TryParseExact($Horario, 'HH:mm',
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::None, [ref]$hora)) {
    throw 'Informe o horário no formato HH:mm.'
}
$inicioHorario = (Get-Date).Date.AddHours($hora.Hour).AddMinutes($hora.Minute)
$usuario = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $usuario -or -not $usuario.User) { throw 'Não foi possível identificar o usuário do Windows.' }

$mesAtual = Join-Path (Join-Path $pastaBaseAbsoluta (Get-Date -Format 'yyyy')) (Get-Date -Format 'MM')
$referencia = Get-ChildItem -LiteralPath $mesAtual -File -Filter '*.ccbak' -ErrorAction Stop |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $referencia) { throw 'Não há cópia de referência no mês atual para conferir a senha.' }
$manifesto = $referencia.FullName + '.sha256'
if (-not (Test-Path -LiteralPath $manifesto -PathType Leaf)) { throw 'Manifesto da cópia de referência ausente.' }
$esperado = ((Get-Content -LiteralPath $manifesto -TotalCount 1) -split '\s+')[0]
if ($esperado -ine (Get-FileHash -LiteralPath $referencia.FullName -Algorithm SHA256).Hash) {
    throw 'A cópia de referência não passou na conferência do SHA-256.'
}

Write-Host "A senha será conferida contra $($referencia.Name) e protegida para este usuário do Windows."
$senha = Read-Host 'Digite a senha de recuperação já guardada fora deste computador' -AsSecureString
if (-not $senha -or $senha.Length -lt 12) { throw 'A senha deve ter ao menos 12 caracteres.' }
. (Join-Path $PSScriptRoot 'CliniCarBackupCrypto.ps1')
$entrada = [IO.File]::OpenRead($referencia.FullName)
try {
    [void](Unprotect-ClinicarBackupStream -Entrada $entrada -Saida ([IO.Stream]::Null) -Senha $senha)
} catch {
    throw 'A senha não autenticou a cópia de referência. Nenhuma tarefa foi registrada.'
} finally { $entrada.Dispose() }

[void](New-Item -ItemType Directory -Path $pastaScripts -Force)

# A pasta de execução fica fora do projeto e só pode ser alterada pelo usuário e pelo SYSTEM.
$aclPasta = Get-Acl -LiteralPath $pastaLocal
$aclPasta.SetAccessRuleProtection($true, $false)
$heranca = [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
foreach ($sid in @($usuario.User, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $regraPasta = [Security.AccessControl.FileSystemAccessRule]::new(
        $sid, [Security.AccessControl.FileSystemRights]::FullControl, $heranca,
        [Security.AccessControl.PropagationFlags]::None,
        [Security.AccessControl.AccessControlType]::Allow)
    $aclPasta.AddAccessRule($regraPasta)
}
Set-Acl -LiteralPath $pastaLocal -AclObject $aclPasta
foreach ($nomeScript in @('Executar-Backup-Agendado-CliniCar.ps1',
        'Backup-CliniCar.ps1', 'CliniCarBackupCrypto.ps1')) {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $nomeScript) -Destination (Join-Path $pastaScripts $nomeScript) -Force
}
$senha | Export-Clixml -Path $arquivoSenha -Force
$senha = $null

# A senha DPAPI permanece somente no perfil local do usuário e não vai ao Git/Drive.
$acl = Get-Acl -LiteralPath $arquivoSenha
$acl.SetAccessRuleProtection($true, $false)
$regraUsuario = [Security.AccessControl.FileSystemAccessRule]::new(
    $usuario.User, [Security.AccessControl.FileSystemRights]::FullControl,
    [Security.AccessControl.AccessControlType]::Allow)
$regraSistema = [Security.AccessControl.FileSystemAccessRule]::new(
    [Security.Principal.SecurityIdentifier]::new('S-1-5-18'),
    [Security.AccessControl.FileSystemRights]::FullControl,
    [Security.AccessControl.AccessControlType]::Allow)
$acl.AddAccessRule($regraUsuario)
$acl.AddAccessRule($regraSistema)
Set-Acl -LiteralPath $arquivoSenha -AclObject $acl

@{ pastaBase = $pastaBaseAbsoluta; horario = $Horario } | ConvertTo-Json |
    Set-Content -LiteralPath $arquivoConfiguracao -Encoding utf8

$existente = Get-ScheduledTask -TaskName $nomeTarefa -ErrorAction SilentlyContinue
if ($existente) {
    $acaoExistente = @($existente.Actions | ForEach-Object { $_.Execute + ' ' + $_.Arguments }) -join ' '
    if ($acaoExistente -notlike '*Executar-Backup-Agendado-CliniCar.ps1*') {
        throw 'Já existe uma tarefa com este nome e ação diferente. Nenhuma tarefa foi substituída.'
    }
}
$argumentos = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -File "' + $executor + '"'
$acao = New-ScheduledTaskAction -Execute $executavel -Argument $argumentos -WorkingDirectory $pastaLocal
$gatilhos = @(
    (New-ScheduledTaskTrigger -Daily -At $inicioHorario),
    (New-ScheduledTaskTrigger -AtLogOn -User $usuario.Name)
)
$principal = New-ScheduledTaskPrincipal -UserId $usuario.Name -LogonType Interactive -RunLevel Limited
$ajustes = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 24 -RestartInterval (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $nomeTarefa -Action $acao -Trigger $gatilhos `
    -Principal $principal -Settings $ajustes -Description 'Backup diário criptografado do banco CliniCar para o Google Drive. Sem exclusão automática.' `
    -Force | Out-Null
Start-ScheduledTask -TaskName $nomeTarefa

Write-Host "Tarefa registrada: $nomeTarefa; todos os dias às $Horario e no logon se não houver cópia íntegra no dia."
Write-Host 'Se Drive ou MySQL estiverem indisponíveis, o Agendador fará até 24 novas tentativas, com intervalo de 30 minutos.'
Write-Host 'Retenção: todas as cópias. A tarefa só executa com este usuário conectado, Google Drive montado e Docker Desktop disponível.'
Write-Host "Uma execução de teste foi iniciada. O último resultado será registrado em $(Join-Path $pastaLocal 'ultimo-resultado.json')."
