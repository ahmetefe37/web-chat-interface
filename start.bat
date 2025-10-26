@echo off
cd /d "%~dp0"

set LOGFILE=run.log

echo ==================================================>> %LOGFILE%
echo Starting new session: %date% %time%>> %LOGFILE%
echo ==================================================>> %LOGFILE%

echo ==================================================
echo Initializing Web Chat Interface Server
echo ==================================================
echo Server URL: http://localhost:5000
echo Ollama URL: http://127.0.0.1:11434
echo Cache Directory: %~dp0cache
echo ==================================================

echo Checking Ollama installation...
echo ==================================================
where ollama >nul 2>nul
if %errorlevel%==0 (
    echo Ollama detected. Starting Ollama server...
    echo [%time%] Starting Ollama server...>> %LOGFILE%
    start /B ollama serve >> %LOGFILE% 2>&1
    timeout /t 5 /nobreak >nul
) else (
    echo Ollama not found. Skipping Ollama startup.
    echo [%time%] Ollama not found. Skipping startup.>> %LOGFILE%
)
echo ==================================================
echo Starting Node.js app...
echo ==================================================
echo [%time%] Starting npm...>> %LOGFILE%
start /B cmd /c "npm start >> %LOGFILE% 2>&1"

echo Waiting for server to start...
set /a counter=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
set /a counter+=1
echo ==================================================
echo Checking localhost... (Attempt %counter%)
curl --silent http://localhost:5000 >nul 2>&1
if %errorlevel%==0 (
    echo Server is up! Opening browser...
    echo [%time%] Server started successfully. Opening browser.>> %LOGFILE%
    start http://localhost:5000
    goto :END
)

if %counter% GEQ 15 (
    echo ERROR: Server did not respond on port 5000.
    echo [%time%] ERROR: Server did not start in expected time.>> %LOGFILE%
    goto :END
)

goto :WAIT_LOOP

:END
echo ==================================================
echo Logs written to: %LOGFILE%
echo ==================================================
pause
