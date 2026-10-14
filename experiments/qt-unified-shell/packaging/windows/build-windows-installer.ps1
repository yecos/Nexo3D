[CmdletBinding()]
param(
    [string]$NexoExe = "",
    [string]$IngeCadRoot = "",
    [string]$IngeTrazoRoot = "C:\Program Files\IngeTrazo",
    [string]$OutputDir = "",
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$qtRoot = (Resolve-Path (Join-Path $scriptRoot "..\..\")).Path
$repoRoot = (Resolve-Path (Join-Path $qtRoot "..\..\")).Path

if (-not $NexoExe) {
    $NexoExe = Join-Path $qtRoot "dist\NEXO-Bridge-CAD-Modelado-Render-PoC.exe"
}
if (-not (Test-Path -LiteralPath $NexoExe -PathType Leaf)) {
    throw "No se encontró el ejecutable de NEXO: $NexoExe"
}
if (-not $IngeCadRoot) {
    $downloads = Join-Path $env:USERPROFILE "Downloads"
    $cadFolder = Get-ChildItem -LiteralPath $downloads -Directory -Filter "IngeCAD-*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "ingecad\ingecad.exe") } |
        Select-Object -First 1
    if ($cadFolder) {
        $IngeCadRoot = Join-Path $cadFolder.FullName "ingecad"
    }
}
if (-not $IngeCadRoot -or -not (Test-Path -LiteralPath (Join-Path $IngeCadRoot "ingecad.exe") -PathType Leaf)) {
    throw "No se encontró una instalación redistribuible de IngeCAD. Usa -IngeCadRoot."
}
if (-not (Test-Path -LiteralPath (Join-Path $IngeTrazoRoot "ingetrazo.exe") -PathType Leaf)) {
    throw "No se encontró una instalación redistribuible de IngeTrazo: $IngeTrazoRoot"
}
if (-not $OutputDir) {
    $OutputDir = Join-Path $repoRoot "dist\windows-installer"
}
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$outputRoot = (Resolve-Path $OutputDir).Path
$installer = Join-Path $outputRoot "NEXO-3D-Setup.exe"

$workRoot = Join-Path $env:TEMP ("nexo-3d-build-" + [guid]::NewGuid().ToString("N"))
$payloadRoot = Join-Path $workRoot "payload\NEXO"
$stagingRoot = Join-Path $workRoot "staging"
New-Item -ItemType Directory -Path $payloadRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null

function Copy-Folder([string]$Source, [string]$Destination) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
}

try {
    Copy-Item -LiteralPath $NexoExe -Destination (Join-Path $payloadRoot "NEXO-Bridge-CAD-Modelado-Render-PoC.exe")
    Copy-Folder $IngeCadRoot (Join-Path $payloadRoot "engines\IngeCAD")
    Copy-Folder $IngeTrazoRoot (Join-Path $payloadRoot "engines\IngeTrazo")

    $pluginSource = Join-Path $qtRoot "plugins\nexo_live_bridge.py"
    if (-not (Test-Path -LiteralPath $pluginSource -PathType Leaf)) {
        throw "No se encontró la extensión NEXO: $pluginSource"
    }
    New-Item -ItemType Directory -Path (Join-Path $payloadRoot "plugins") -Force | Out-Null
    Copy-Item -LiteralPath $pluginSource -Destination (Join-Path $payloadRoot "plugins\nexo_live_bridge.py")
    New-Item -ItemType Directory -Path (Join-Path $payloadRoot "docs") -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot "LICENSE") -Destination (Join-Path $payloadRoot "docs\NEXO-LICENSE")
    Copy-Item -LiteralPath (Join-Path $repoRoot "THIRD_PARTY_NOTICES.md") -Destination (Join-Path $payloadRoot "docs\THIRD_PARTY-NOTICES.md")

    $engineEntries = @()
    foreach ($entry in @(
        @{ Id = "IngeCAD"; Relative = "engines\IngeCAD\ingecad.exe"; Source = (Join-Path $IngeCadRoot "ingecad.exe") },
        @{ Id = "IngeTrazo"; Relative = "engines\IngeTrazo\ingetrazo.exe"; Source = (Join-Path $IngeTrazoRoot "ingetrazo.exe") }
    )) {
        $info = Get-Item -LiteralPath $entry.Source
        $engineEntries += [ordered]@{
            id = $entry.Id
            executable = ($entry.Relative -replace "\\", "/")
            version = $info.VersionInfo.FileVersion
            bytes = $info.Length
            sha256 = (Get-FileHash -LiteralPath $entry.Source -Algorithm SHA256).Hash
        }
    }
    $manifest = [ordered]@{
        schema = 1
        product = "NEXO 3D"
        bundle_type = "private-windows-bundle"
        built_at_utc = (Get-Date).ToUniversalTime().ToString("o")
        engines = $engineEntries
        plugin = [ordered]@{
            path = "plugins/nexo_live_bridge.py"
            sha256 = (Get-FileHash -LiteralPath $pluginSource -Algorithm SHA256).Hash
        }
    }
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $payloadRoot "bundle-manifest.json") -Encoding UTF8

    $zipPath = Join-Path $stagingRoot "nexo-payload.zip"
    & tar.exe -a -c -f $zipPath -C (Split-Path $payloadRoot -Parent) NEXO
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $zipPath -PathType Leaf)) {
        throw "No se pudo comprimir el paquete interno de NEXO."
    }

    Copy-Item -LiteralPath (Join-Path $scriptRoot "install.cmd") -Destination $stagingRoot
    Copy-Item -LiteralPath (Join-Path $scriptRoot "install-nexo.ps1") -Destination $stagingRoot

    $sedPath = Join-Path $workRoot "nexo-3d.sed"
    $sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3

[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=1
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=I
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=install.cmd
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles

[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=NEXO 3D quedó instalado. Puedes abrirlo desde el menú Inicio.
TargetName=$installer
FriendlyName=NEXO 3D - CAD + Modelado + Render
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
FILE0="install.cmd"
FILE1="install-nexo.ps1"
FILE2="nexo-payload.zip"

[SourceFiles]
SourceFiles0=$stagingRoot

[SourceFiles0]
%FILE0%=
%FILE1%=
%FILE2%=
"@
    $sed | Set-Content -LiteralPath $sedPath -Encoding ASCII

    if (-not $SkipInstaller) {
        if (Test-Path -LiteralPath $installer) {
            Remove-Item -LiteralPath $installer -Force
        }
        $iexpress = Start-Process -FilePath "$env:WINDIR\System32\iexpress.exe" -ArgumentList @("/N", $sedPath) -Wait -PassThru
        if ($iexpress.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $installer -PathType Leaf)) {
            throw "IExpress no generó el instalador."
        }
    }

    $summary = [ordered]@{
        installer = $installer
        size_bytes = (Get-Item -LiteralPath $installer).Length
        sha256 = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash
        engines = $engineEntries
    }
    $summary | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outputRoot "NEXO-3D-Setup.manifest.json") -Encoding UTF8
    Write-Output ($summary | ConvertTo-Json -Depth 8)
} finally {
    if (Test-Path -LiteralPath $workRoot) {
        Remove-Item -LiteralPath $workRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
