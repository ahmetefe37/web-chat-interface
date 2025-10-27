@echo off
chcp 65001 >nul
setlocal enableextensions enabledelayedexpansion
set "LOGFILE=start.log"
set "PROJECT_DIR=%~1"

REM Navigate to project directory if provided
if not "%PROJECT_DIR%"=="" (
	cd /d "%PROJECT_DIR%"
)

echo ==================================================>> "%LOGFILE%"
echo Starting new session: %date% %time%>> "%LOGFILE%"
echo ==================================================>> "%LOGFILE%"

echo.
echo ==================================================
echo Initializing Web Chat Interface Server
echo ==================================================
echo Server URL: http://localhost:5000
echo Ollama URL: http://127.0.0.1:11434
echo Cache Directory: %cd%\cache
echo Project Directory: %cd%
echo ==================================================>> "%LOGFILE%"
echo.

echo Checking Ollama installation...
echo [%time%] Checking Ollama...>> "%LOGFILE%"

where ollama >nul 2>nul
if !errorlevel!==0 (
	echo Ollama detected. Checking if already running...
	netstat -ano | findstr :11434 >nul 2>nul
	if !errorlevel!==0 (
		echo Ollama already running on port 11434. Skipping.
		echo [%time%] Ollama already running.>> "%LOGFILE%"
	) else (
		echo Starting Ollama server...
		echo [%time%] Starting Ollama server...>> "%LOGFILE%"
		start "Ollama Server" cmd /k "ollama serve"
		timeout /t 5 /nobreak >nul
	)
) else (
	echo Ollama not found. Skipping Ollama startup.
	echo [%time%] Ollama not found.>> "%LOGFILE%"
)

echo.
echo ==================================================
echo Starting Node.js app...
echo ==================================================
echo [%time%] Starting npm start...>> "%LOGFILE%"
echo.

cd /d "%PROJECT_DIR%"
start "npm Server" cmd /k "npm start"

echo Waiting for server to start...
set /a counter=0

:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a counter+=1

echo ==================================================
echo Checking localhost... (Attempt !counter!)
echo ==================================================

curl --silent http://localhost:5000 >nul 2>&1
if !errorlevel!==0 (
	echo.
	echo Server is up! Opening browser...
	echo [%time%] Server started successfully. Opening browser.>> "%LOGFILE%"
	timeout /t 2 /nobreak >nul
	start http://localhost:5000
	goto END
)

if !counter! GEQ 20 (
	echo.
	echo ERROR: Server did not respond on port 5000.
	echo [%time%] ERROR: Server did not start in time.>> "%LOGFILE%"
	goto END
)

goto WAIT_LOOP

:END
echo.
echo ==================================================
echo Logs written to: %LOGFILE%
echo ==================================================
echo [%time%] Session ended.>> "%LOGFILE%"
echo ==================================================>> "%LOGFILE%"
exit /b 0
endlocal