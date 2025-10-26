@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
cd /d "%~dp0"

set "MAIN_LOGFILE=main.log"
set "CLONE_LOGFILE=clone.log"
set "SETUP_LOGFILE=setup.log"
set "SCRIPT_DIR=%cd%"
set "REPO_URL=https://github.com/ahmetefe37/web-chat-interface.git"
set "PROJECT_DIR=%SCRIPT_DIR%\web-chat-interface"

echo ==================================================>> "%MAIN_LOGFILE%"
echo [%date% %time%] MAIN ORCHESTRATOR START >> "%MAIN_LOGFILE%"
echo ==================================================>> "%MAIN_LOGFILE%"

REM ========== STEP 1: GIT CLONE ==========
echo.
echo ==================================================
echo STEP 1: GIT CLONE
echo ==================================================
echo ==================================================>> "%CLONE_LOGFILE%"
echo Starting new session: %date% %time%>> "%CLONE_LOGFILE%"
echo ==================================================>> "%CLONE_LOGFILE%"

echo Script directory: %SCRIPT_DIR%
echo Project directory: %PROJECT_DIR%
echo Repository: %REPO_URL%
echo.
echo ==================================================>> "%CLONE_LOGFILE%"
echo Checking folder...>> "%CLONE_LOGFILE%"

if exist "%PROJECT_DIR%" (
	echo %PROJECT_DIR% already exists. Skipping clone.
	echo %PROJECT_DIR% already exists.>>"%CLONE_LOGFILE%"
	goto SKIP_CLONE
)

echo ==================================================>> "%CLONE_LOGFILE%"
echo Starting git clone...>> "%CLONE_LOGFILE%"
echo ==================================================>> "%CLONE_LOGFILE%"
echo.

git clone "%REPO_URL%" "%PROJECT_DIR%" >>"%CLONE_LOGFILE%" 2>&1
if errorlevel 1 (
	echo ERROR: Git clone failed
	echo ERROR: Git clone failed>>"%CLONE_LOGFILE%"
	echo.
	type "%CLONE_LOGFILE%"
	goto END
)

echo.
echo ==================================================>> "%CLONE_LOGFILE%"
echo Clone successful!>> "%CLONE_LOGFILE%"
echo Clone successful.
echo Project directory: %PROJECT_DIR%
echo ==================================================>> "%CLONE_LOGFILE%"

:SKIP_CLONE
echo.

REM ========== STEP 2: NODE SETUP AND NPM INSTALL ==========
echo ==================================================
echo STEP 2: NODE SETUP AND NPM INSTALL
echo ==================================================
echo ==================================================>> "%SETUP_LOGFILE%"
echo [%date% %time%] START >> "%SETUP_LOGFILE%"
echo ==================================================>> "%SETUP_LOGFILE%"

cd /d "%PROJECT_DIR%"

echo.
echo Current directory: %cd%>> "%SETUP_LOGFILE%"
echo Checking Node.js...
echo Checking Node.js...>> "%SETUP_LOGFILE%"

where node >nul 2>nul
if errorlevel 1 goto NODE_MISSING

echo Node found.
echo Node found.>>"%SETUP_LOGFILE%"
goto NPM_INSTALL

:NODE_MISSING
echo Node NOT found. Will download and install.
echo Node NOT found.>>"%SETUP_LOGFILE%"
echo.

where curl >nul 2>nul
if errorlevel 1 (
	echo ERROR: curl is missing.
	echo ERROR: curl missing.>>"%SETUP_LOGFILE%"
	goto END
)

set "NODE_MSI=node-v20.18.0-x64.msi"
echo Downloading Node LTS...
echo [%time%] Downloading Node...>> "%SETUP_LOGFILE%"

curl -L -o "%NODE_MSI%" https://nodejs.org/dist/latest-v20.x/node-v20.18.0-x64.msi >>"%SETUP_LOGFILE%" 2>&1

if not exist "%NODE_MSI%" (
	echo ERROR: download failed.
	echo ERROR: download failed.>>"%SETUP_LOGFILE%"
	goto END
)

echo Installing Node...
echo [%time%] Installing Node...>> "%SETUP_LOGFILE%"

msiexec /i "%NODE_MSI%" /quiet /norestart >>"%SETUP_LOGFILE%" 2>&1
if errorlevel 1 (
	echo ERROR: Node install failed.
	echo ERROR: Node install failed.>>"%SETUP_LOGFILE%"
	goto END
)

del "%NODE_MSI%"
echo Node installed successfully.
echo Node installed.>>"%SETUP_LOGFILE%"
echo.

:NPM_INSTALL
echo ==================================================
echo Running npm install...
echo [%time%] Running npm install...>> "%SETUP_LOGFILE%"
echo ==================================================>> "%SETUP_LOGFILE%"
echo.

cd /d "%PROJECT_DIR%"
call npm install >>"%SETUP_LOGFILE%" 2>&1

if errorlevel 1 (
	echo ERROR: npm install failed.
	echo ERROR: npm install failed.>>"%SETUP_LOGFILE%"
	type "%SETUP_LOGFILE%"
	goto END
) else (
	echo npm install completed successfully.
	echo npm install OK.>>"%SETUP_LOGFILE%"
)

echo.
echo ==================================================>> "%SETUP_LOGFILE%"
echo [%date% %time%] END >> "%SETUP_LOGFILE%"
echo ==================================================>> "%SETUP_LOGFILE%"

:END
echo.
echo ==================================================
echo [%date% %time%] SETUP COMPLETED
echo ==================================================
echo Log files:
echo   - Main Log: %MAIN_LOGFILE%
echo   - Clone Log: %CLONE_LOGFILE%
echo   - Setup Log: %SETUP_LOGFILE%
echo.
echo Project folder: %PROJECT_DIR%
echo ==================================================>> "%MAIN_LOGFILE%"
echo [%date% %time%] MAIN ORCHESTRATOR END >> "%MAIN_LOGFILE%"
echo ==================================================>> "%MAIN_LOGFILE%"
echo.
echo Setup complete! Now run: start.bat
echo.
exit /b 0
endlocal