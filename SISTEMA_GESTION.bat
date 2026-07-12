@echo off
chcp 65001 > nul
title Sistema de Gestion Proveedores y Materias Primas - FILLING COLOMBIA

echo.
echo ================================================================
echo   SISTEMA DE GESTION DE PROVEEDORES Y MATERIAS PRIMAS
echo   FILLING COLOMBIA
echo ================================================================
echo.

set "BASE=%~dp0"
if "%BASE:~-1%"=="\" set "BASE=%BASE:~0,-1%"
set "SCRIPTS=%BASE%\scripts"

echo Seleccione una opcion:
echo.
echo   [1] Iniciar Servidor y abrir Dashboard Web (RECOMENDADO - Permite Crear/Editar/Cargar)
echo   [2] Actualizar base de datos y llenar Excel (requiere Google Drive)
echo   [3] Abrir archivo Excel
echo   [4] Solo abrir Dashboard en modo estatico (Solo Lectura)
echo   [0] Salir
echo.
set /p OPT="Ingrese opcion: "

if "%OPT%"=="1" goto SERVIDOR
if "%OPT%"=="2" goto ACTUALIZAR
if "%OPT%"=="3" goto ABRIR_EXCEL
if "%OPT%"=="4" goto ESTATICO
if "%OPT%"=="0" goto FIN
goto FIN

:SERVIDOR
echo.
echo Iniciando Servidor Local de Calidad en segundo plano...
start "Servidor Calidad" powershell -ExecutionPolicy Bypass -File "%SCRIPTS%\server.ps1"
echo.
echo Servidor iniciado. El navegador se abrira automaticamente.
goto FIN

:ACTUALIZAR
echo.
echo Conectando con Google Drive y actualizando Excel...
echo (Asegurese de tener Google Drive activo en su PC)
echo.
powershell -ExecutionPolicy Bypass -File "%SCRIPTS%\populate_from_drive.ps1" -AbrirExcel
echo.
echo Proceso completado.
goto PAUSA

:ABRIR_EXCEL
echo.
echo Abriendo archivo Excel...
start "" "%BASE%\CONTROL DE PROVEEDORES Y MATERIAS PRIMAS.xlsx"
goto FIN

:ESTATICO
echo.
echo Abriendo Dashboard en modo estatico de solo lectura...
start "" "%BASE%\index.html"
goto FIN

:PAUSA
echo.
echo Presione cualquier tecla para volver al menu...
pause > nul
goto MENU_LOOP

:MENU_LOOP
cls
goto INICIO_MENU

:INICIO_MENU
echo.
echo ================================================================
echo   SISTEMA DE GESTION DE PROVEEDORES Y MATERIAS PRIMAS
echo ================================================================
echo.
echo   [1] Iniciar Servidor y abrir Dashboard Web
echo   [2] Actualizar base de datos y llenar Excel
echo   [3] Abrir archivo Excel
echo   [0] Salir
echo.
set /p OPT2="Ingrese opcion: "
if "%OPT2%"=="1" goto SERVIDOR
if "%OPT2%"=="2" goto ACTUALIZAR
if "%OPT2%"=="3" goto ABRIR_EXCEL
if "%OPT2%"=="0" goto FIN
goto INICIO_MENU

:FIN
echo.
echo Hasta luego.
timeout /t 2 > nul
exit
