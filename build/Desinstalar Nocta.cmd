@echo off
rem Desinstalador de la versión en .zip de Nocta. Va dentro de la carpeta de la app, junto a Nocta.exe.
chcp 65001 >nul
setlocal
title Desinstalar Nocta
set "DIR=%~dp0"
set "DIR=%DIR:~0,-1%"
set "DATOS=%APPDATA%\Nocta"

echo.
echo   Desinstalar Nocta
echo   =================
echo.

rem Seguridad: solo se borra la carpeta si de verdad es la de Nocta
if not exist "%DIR%\Nocta.exe" goto :no_es_nocta
if not exist "%DIR%\resources\app\package.json" goto :no_es_nocta

"%SystemRoot%\System32\tasklist.exe" /fi "imagename eq Nocta.exe" 2>nul | "%SystemRoot%\System32\find.exe" /i "Nocta.exe" >nul
if not errorlevel 1 goto :abierta

echo   Se borrará la carpeta de la aplicación:
echo     %DIR%
echo.
choice /c SN /n /m "  ¿Quieres desinstalar Nocta? [S/N] "
if errorlevel 2 goto :cancelado

echo.
echo   Tus tareas, exámenes y asignaturas están guardados aparte, en:
echo     %DATOS%
echo   Si los conservas, volverán a aparecer cuando vuelvas a usar Nocta.
echo.
choice /c SN /n /m "  ¿Borrar también tus datos? No se puede deshacer. [S/N] "
set "BORRAR_DATOS=%errorlevel%"

rem Accesos directos del escritorio y del menú Inicio que apunten a esta carpeta
powershell -NoProfile -Command "$d = '%DIR%'; $s = New-Object -ComObject WScript.Shell; foreach ($f in [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')) { Get-ChildItem -LiteralPath $f -Filter *.lnk -ErrorAction SilentlyContinue | Where-Object { $s.CreateShortcut($_.FullName).TargetPath -like ($d + '\*') } | Remove-Item -Force }" >nul 2>&1

if "%BORRAR_DATOS%"=="1" if exist "%DATOS%" rmdir /s /q "%DATOS%"

echo.
if "%BORRAR_DATOS%"=="1" (echo   Nocta y tus datos se han borrado.) else (echo   Nocta se ha desinstalado. Tus datos siguen guardados.)
echo.
pause

rem La carpeta se borra al final, cuando este archivo ya ha terminado de leerse
cd /d "%TEMP%"
(goto) 2>nul & rmdir /s /q "%DIR%"

:no_es_nocta
echo   Este archivo tiene que estar dentro de la carpeta de Nocta, junto a Nocta.exe.
echo   No se ha borrado nada.
echo.
pause
exit /b 1

:abierta
echo   Nocta está abierta. Ciérrala y vuelve a ejecutar este archivo.
echo.
pause
exit /b 1

:cancelado
echo.
echo   No se ha borrado nada.
echo.
pause
exit /b 0
