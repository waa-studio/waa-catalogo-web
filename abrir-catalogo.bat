@echo off
title WAA Catalogo
cd /d "%~dp0"

REM ─────────────────────────────────────────────────────────────
REM  WAA Catalogo
REM
REM  Un solo paso: revisa las carpetas de assets, actualiza los datos
REM  con lo que encuentre, y abre la web en el navegador.
REM
REM  Correr el escaneo siempre es mas seguro que acordarse de hacerlo:
REM  tarda un instante y evita ver el catalogo desactualizado.
REM
REM  No instala nada. Usa PowerShell, que ya viene con Windows.
REM
REM  Nota tecnica: los saltos (goto) en vez de bloques entre
REM  parentesis son a proposito. Dentro de un bloque, %ERRORLEVEL%
REM  se evalua al leer el archivo y no al ejecutarlo, asi que
REM  siempre devolveria el valor anterior.
REM ─────────────────────────────────────────────────────────────

if not exist "%~dp0index.html" goto :faltaWeb
if not exist "%~dp0abrir-catalogo.ps1" goto :faltaScript

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0abrir-catalogo.ps1"
set CODIGO=%ERRORLEVEL%
goto :abrir

:faltaScript
echo.
echo  Falta abrir-catalogo.ps1: abro el catalogo sin revisar las carpetas.
echo.
set CODIGO=0
goto :abrir

:abrir
start "" "%~dp0index.html"

REM Codigo 2 = hubo avisos (archivos pesados, nombres sin ano).
REM Solo en ese caso la ventana se queda abierta para poder leerlos.
if not "%CODIGO%"=="2" goto :fin
echo.
echo  ------------------------------------------------
echo   Revisa los avisos de arriba.
echo   El catalogo ya se abrio igual.
echo  ------------------------------------------------
echo.
pause
goto :fin

:faltaWeb
echo.
echo  No encuentro index.html junto a este archivo.
echo  El .bat tiene que quedar en la misma carpeta que la web.
echo.
pause

:fin
