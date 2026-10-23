param([Parameter(Mandatory = $true)][string]$NodeExecutable)

$ErrorActionPreference = 'Stop'
$OutputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $OutputEncoding

function Read-SetupPassword([string]$Label) {
    $secureValue = Read-Host -Prompt $Label -AsSecureString
    $buffer = [IntPtr]::Zero
    try {
        $buffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)
    } finally {
        if ($buffer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)
        }
        $secureValue.Dispose()
    }
}

try {
    $password = Read-SetupPassword 'New administrator password (12-256 characters)'
    $confirmation = Read-SetupPassword 'Confirm password'
    # Transfer through a private stdin pipe, never command arguments, environment
    # variables, terminal output, or a file containing the plaintext password.
    @{ password = $password; confirmation = $confirmation } | ConvertTo-Json -Compress |
        & $NodeExecutable (Join-Path $PSScriptRoot 'security-setup.mjs') --windows-input
    $setupExitCode = $LASTEXITCODE
} finally {
    $password = $null
    $confirmation = $null
}
exit $setupExitCode
