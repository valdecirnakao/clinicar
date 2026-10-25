# Formato versionado: cabeçalho, salt, prefixo de nonce, blocos AES-256-GCM e marcador final autenticado.
# A senha nunca é passada como argumento de linha de comando nem gravada no arquivo.
$script:ClinicarBackupMagic = [Text.Encoding]::ASCII.GetBytes("CLINICAR-BACKUP-V1`n")
$script:ClinicarBackupChunkSize = 1024 * 1024
$script:ClinicarBackupIterations = 600000

function Get-ClinicarBackupKey {
    param([Parameter(Mandatory)][Security.SecureString]$Senha, [Parameter(Mandatory)][byte[]]$Salt)
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Senha)
    $senhaBytes = $null
    try {
        $texto = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        $senhaBytes = [Text.Encoding]::UTF8.GetBytes($texto)
        $texto = $null
        return [Security.Cryptography.Rfc2898DeriveBytes]::Pbkdf2(
            $senhaBytes, $Salt, $script:ClinicarBackupIterations,
            [Security.Cryptography.HashAlgorithmName]::SHA256, 32)
    } finally {
        if ($senhaBytes) { [Array]::Clear($senhaBytes) }
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

function Get-ClinicarBackupNonce {
    param([byte[]]$Prefixo, [UInt64]$Indice)
    $nonce = [byte[]]::new(12)
    [Buffer]::BlockCopy($Prefixo, 0, $nonce, 0, 4)
    [Buffer]::BlockCopy([BitConverter]::GetBytes($Indice), 0, $nonce, 4, 8)
    return $nonce
}

function Get-ClinicarBackupAad {
    param([UInt64]$Indice, [int]$Tamanho, [UInt64]$Total = 0)
    $aad = [byte[]]::new($(if ($Tamanho -eq 0) { 20 } else { 12 }))
    [Buffer]::BlockCopy([BitConverter]::GetBytes($Indice), 0, $aad, 0, 8)
    [Buffer]::BlockCopy([BitConverter]::GetBytes($Tamanho), 0, $aad, 8, 4)
    if ($Tamanho -eq 0) { [Buffer]::BlockCopy([BitConverter]::GetBytes($Total), 0, $aad, 12, 8) }
    return $aad
}

function Protect-ClinicarBackupStream {
    param([Parameter(Mandatory)][IO.Stream]$Entrada,
          [Parameter(Mandatory)][IO.Stream]$Saida,
          [Parameter(Mandatory)][Security.SecureString]$Senha)
    $salt = [byte[]]::new(16)
    $prefixo = [byte[]]::new(4)
    [Security.Cryptography.RandomNumberGenerator]::Fill($salt)
    [Security.Cryptography.RandomNumberGenerator]::Fill($prefixo)
    $chave = Get-ClinicarBackupKey -Senha $Senha -Salt $salt
    $escritor = [IO.BinaryWriter]::new($Saida, [Text.Encoding]::ASCII, $true)
    $aes = [Security.Cryptography.AesGcm]::new($chave, 16)
    $buffer = [byte[]]::new($script:ClinicarBackupChunkSize)
    $indice = [UInt64]0
    $total = [UInt64]0
    try {
        $escritor.Write($script:ClinicarBackupMagic)
        $escritor.Write($salt)
        $escritor.Write($prefixo)
        while (($tamanho = $Entrada.Read($buffer, 0, $buffer.Length)) -gt 0) {
            $limpo = [byte[]]::new($tamanho)
            [Buffer]::BlockCopy($buffer, 0, $limpo, 0, $tamanho)
            $cifrado = [byte[]]::new($tamanho)
            $tag = [byte[]]::new(16)
            try {
                $aes.Encrypt((Get-ClinicarBackupNonce $prefixo $indice), $limpo, $cifrado, $tag,
                    (Get-ClinicarBackupAad $indice $tamanho))
                $escritor.Write([int]$tamanho)
                $escritor.Write($cifrado)
                $escritor.Write($tag)
                $total += [UInt64]$tamanho
                $indice++
            } finally { [Array]::Clear($limpo) }
        }
        $tagFinal = [byte[]]::new(16)
        $aes.Encrypt((Get-ClinicarBackupNonce $prefixo $indice), [byte[]]::new(0), [byte[]]::new(0),
            $tagFinal, (Get-ClinicarBackupAad $indice 0 $total))
        $escritor.Write([int]0)
        $escritor.Write([UInt64]$total)
        $escritor.Write($tagFinal)
        $escritor.Flush()
        return $total
    } finally {
        [Array]::Clear($buffer)
        [Array]::Clear($chave)
        $aes.Dispose()
        $escritor.Dispose()
    }
}

function Read-ClinicarBackupBytes {
    param([IO.BinaryReader]$Leitor, [int]$Tamanho)
    $bytes = $Leitor.ReadBytes($Tamanho)
    if ($bytes.Length -ne $Tamanho) { throw 'Backup criptografado incompleto.' }
    return ,$bytes
}

function Unprotect-ClinicarBackupStream {
    param([Parameter(Mandatory)][IO.Stream]$Entrada,
          [Parameter(Mandatory)][IO.Stream]$Saida,
          [Parameter(Mandatory)][Security.SecureString]$Senha)
    $leitor = [IO.BinaryReader]::new($Entrada, [Text.Encoding]::ASCII, $true)
    $chave = $null
    $aes = $null
    try {
        $magic = Read-ClinicarBackupBytes $leitor $script:ClinicarBackupMagic.Length
        if (-not [Linq.Enumerable]::SequenceEqual([byte[]]$magic, [byte[]]$script:ClinicarBackupMagic)) {
            throw 'Formato de backup criptografado inválido.'
        }
        $salt = Read-ClinicarBackupBytes $leitor 16
        $prefixo = Read-ClinicarBackupBytes $leitor 4
        $chave = Get-ClinicarBackupKey -Senha $Senha -Salt $salt
        $aes = [Security.Cryptography.AesGcm]::new($chave, 16)
        $indice = [UInt64]0
        $total = [UInt64]0
        while ($true) {
            $tamanhoBytes = Read-ClinicarBackupBytes $leitor 4
            $tamanho = [BitConverter]::ToInt32($tamanhoBytes, 0)
            if ($tamanho -lt 0 -or $tamanho -gt $script:ClinicarBackupChunkSize) {
                throw 'Bloco de backup inválido.'
            }
            if ($tamanho -eq 0) {
                $totalGravado = [BitConverter]::ToUInt64((Read-ClinicarBackupBytes $leitor 8), 0)
                $tag = Read-ClinicarBackupBytes $leitor 16
                $aes.Decrypt((Get-ClinicarBackupNonce $prefixo $indice), [byte[]]::new(0), $tag,
                    [byte[]]::new(0), (Get-ClinicarBackupAad $indice 0 $totalGravado))
                if ($totalGravado -ne $total -or $leitor.BaseStream.ReadByte() -ne -1) {
                    throw 'Backup incompleto ou com dados extras.'
                }
                return $total
            }
            $cifrado = Read-ClinicarBackupBytes $leitor $tamanho
            $tag = Read-ClinicarBackupBytes $leitor 16
            $limpo = [byte[]]::new($tamanho)
            try {
                $aes.Decrypt((Get-ClinicarBackupNonce $prefixo $indice), $cifrado, $tag,
                    $limpo, (Get-ClinicarBackupAad $indice $tamanho))
                $Saida.Write($limpo, 0, $tamanho)
                $total += [UInt64]$tamanho
                $indice++
            } finally { [Array]::Clear($limpo) }
        }
    } finally {
        if ($aes) { $aes.Dispose() }
        if ($chave) { [Array]::Clear($chave) }
        $leitor.Dispose()
    }
}
