[CmdletBinding()]
param(
    [switch]$NoElevation,
    [string]$InstallRoot = ""
)

$ErrorActionPreference = "Stop"

function Get-Sha256([string]$Path) {
    (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin -and -not $InstallRoot) {
    $args = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $PSCommandPath,
        "-NoElevation"
    )
    $child = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $args
    exit $child.ExitCode
}

$payload = Join-Path $PSScriptRoot "nexo-payload.zip"
if (-not (Test-Path -LiteralPath $payload -PathType Leaf)) {
    throw "No se encontró el paquete interno de NEXO."
}

$extractRoot = Join-Path $env:TEMP ("NEXO-3D-install-" + [guid]::NewGuid().ToString("N"))
$installRoot = if ($InstallRoot) {
    [IO.Path]::GetFullPath($InstallRoot)
} else {
    Join-Path $env:ProgramFiles "NEXO 3D"
}
New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

try {
    Expand-Archive -LiteralPath $payload -DestinationPath $extractRoot -Force
    $sourceRoot = Join-Path $extractRoot "NEXO"
    if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
        throw "El paquete interno no contiene la carpeta NEXO."
    }

    New-Item -ItemType Directory -Path $installRoot -Force | Out-Null
    Copy-Item -Path (Join-Path $sourceRoot "*") -Destination $installRoot -Recurse -Force

    $pluginSource = Join-Path $installRoot "plugins\nexo_live_bridge.py"
    $pluginDestination = Join-Path $env:APPDATA "ingetrazo\plugins\nexo_live_bridge.py"
    if (Test-Path -LiteralPath $pluginSource -PathType Leaf) {
        if (-not (Test-Path -LiteralPath $pluginDestination -PathType Leaf)) {
            New-Item -ItemType Directory -Path (Split-Path $pluginDestination) -Force | Out-Null
            Copy-Item -LiteralPath $pluginSource -Destination $pluginDestination
        } elseif ((Get-Sha256 $pluginSource) -ne (Get-Sha256 $pluginDestination)) {
            Copy-Item -LiteralPath $pluginSource -Destination ($pluginDestination + ".nexo-new") -Force
            Write-Warning "Se conservó la extensión existente; la nueva quedó como .nexo-new."
        }
    }

    $startMenu = Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\NEXO 3D"
    New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
    $target = Join-Path $installRoot "NEXO-Bridge-CAD-Modelado-Render-PoC.exe"
    $shortcutPath = Join-Path $startMenu "NEXO 3D.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $target
    $shortcut.WorkingDirectory = $installRoot
    $shortcut.Description = "NEXO 3D · CAD + Modelado + Render"
    $shortcut.Save()

    $desktop = [Environment]::GetFolderPath("Desktop")
    if ($desktop) {
        $desktopShortcut = Join-Path $desktop "NEXO 3D.lnk"
        $desktopLink = $shell.CreateShortcut($desktopShortcut)
        $desktopLink.TargetPath = $target
        $desktopLink.WorkingDirectory = $installRoot
        $desktopLink.Description = "NEXO 3D · CAD + Modelado + Render"
        $desktopLink.Save()
    }

    Write-Output "NEXO 3D instalado en: $installRoot"
    Write-Output "IngeCAD e IngeTrazo quedaron dentro de la instalación de NEXO."
    Write-Output "La extensión NEXO quedó preparada en el perfil de IngeTrazo."
} finally {
    if (Test-Path -LiteralPath $extractRoot) {
        Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
