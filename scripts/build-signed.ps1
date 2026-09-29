<#
.SYNOPSIS
  Builds a code-signed Windows installer and verifies every binary is signed.

.DESCRIPTION
  Prompts for the PFX password (never echoed, never written to disk or shell history),
  checks that the PFX opens and matches the expected certificate, then runs electron-builder
  with the certificate passed through process-scoped environment variables that are
  removed again when the build finishes.

.EXAMPLE
  .\scripts\build-signed.ps1
  .\scripts\build-signed.ps1 -PfxPath D:\keys\codesign.pfx
  .\scripts\build-signed.ps1 -VerifyOnly
#>
param(
    [string]$PfxPath = 'C:\temp\sec\codesign.pfx',
    [string]$ExpectedThumbprint = '7C2CC957BDFC6A211485D81C26CA68E7366CD644',
    [string]$DistDir = 'dist',
    [switch]$VerifyOnly
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot

function Test-BuildSignatures {
    param([string]$DistDir, [string]$Thumbprint)

    $pkg = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
    $files = @(Get-ChildItem (Join-Path $DistDir 'win-unpacked') -Recurse -File -Include *.exe, *.dll, *.node)
    $installer = Join-Path $DistDir "nsis-web\$($pkg.productName) Web Setup $($pkg.version).exe"
    if (Test-Path $installer) { $files += Get-Item $installer }
    else { Write-Warning "Installer not found: $installer" }

    $ours = 0; $vendor = 0; $untrustedChain = 0; $noTimestamp = 0
    $failed = @()
    foreach ($file in $files) {
        $sig = Get-AuthenticodeSignature $file.FullName
        if ($sig.SignerCertificate -and $sig.SignerCertificate.Thumbprint -eq $Thumbprint) {
            # UnknownError here means the signature is intact but the issuing CA is not
            # trusted on this machine - expected for a test CA certificate.
            if ($sig.Status -in 'Valid', 'UnknownError') {
                $ours++
                if ($sig.Status -eq 'UnknownError') { $untrustedChain++ }
                if (-not $sig.TimeStamperCertificate) { $noTimestamp++ }
                continue
            }
        }
        elseif ($sig.Status -eq 'Valid') { $vendor++; continue }
        $failed += [pscustomobject]@{ Status = $sig.Status; File = $file.FullName }
    }

    Write-Host ''
    Write-Host "Checked $($files.Count) files:"
    Write-Host "  signed with our certificate : $ours"
    Write-Host "  signed by original vendor   : $vendor"
    if ($untrustedChain) { Write-Host "  ($untrustedChain have an issuing CA not trusted on this machine - signature itself is intact)" -ForegroundColor Yellow }
    if ($noTimestamp) { Write-Host "  WARNING: $noTimestamp signatures have no timestamp and become invalid when the certificate expires" -ForegroundColor Yellow }
    if ($failed.Count) {
        Write-Host "  NOT SIGNED / INVALID        : $($failed.Count)" -ForegroundColor Red
        $failed | Format-Table -AutoSize | Out-String -Width 300 | Write-Host
        return $false
    }
    Write-Host '  All binaries signed.' -ForegroundColor Green
    return $true
}

if ($VerifyOnly) {
    if (-not (Test-BuildSignatures -DistDir $DistDir -Thumbprint $ExpectedThumbprint)) { exit 1 }
    exit 0
}

if (-not (Test-Path $PfxPath)) { throw "PFX file not found: $PfxPath" }

$securePassword = Read-Host "Password for $PfxPath" -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password

# Fail fast on a wrong password or wrong certificate instead of halfway through the build.
try {
    $cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
        $PfxPath, $password,
        [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet)
}
catch {
    throw "Could not open the PFX - wrong password? ($($_.Exception.InnerException.Message))"
}
try {
    if (-not $cert.HasPrivateKey) { throw 'PFX does not contain a private key.' }
    if ($cert.Thumbprint -ne $ExpectedThumbprint) {
        throw "PFX contains certificate $($cert.Thumbprint), expected $ExpectedThumbprint. Pass -ExpectedThumbprint if the certificate was renewed."
    }
    Write-Host "Certificate OK: $($cert.Subject), valid until $($cert.NotAfter.ToString('d.M.yyyy'))" -ForegroundColor Green
}
finally {
    $cert.Dispose()
}

$env:WIN_CSC_LINK = $PfxPath
$env:WIN_CSC_KEY_PASSWORD = $password
try {
    # forceCodeSigning makes the build fail instead of silently producing unsigned files.
    npx electron-builder --win '--config.forceCodeSigning=true'
    if ($LASTEXITCODE -ne 0) { throw "electron-builder failed (exit code $LASTEXITCODE)" }
}
finally {
    Remove-Item Env:WIN_CSC_LINK, Env:WIN_CSC_KEY_PASSWORD -ErrorAction SilentlyContinue
    $password = $null
}

if (-not (Test-BuildSignatures -DistDir $DistDir -Thumbprint $ExpectedThumbprint)) { exit 1 }
