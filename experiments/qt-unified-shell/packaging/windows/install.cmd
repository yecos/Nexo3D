@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-nexo.ps1"
exit /b %ERRORLEVEL%
