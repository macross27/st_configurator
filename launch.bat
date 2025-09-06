@echo off
setlocal enabledelayedexpansion

echo Reading configuration from .env file...

:: Read ports from .env file
set FRONTEND_PORT=3020
set BACKEND_PORT=3030

for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="FRONTEND_PORT" set FRONTEND_PORT=%%b
    if "%%a"=="PORT" set BACKEND_PORT=%%b
)

echo Frontend port: %FRONTEND_PORT%
echo Backend port: %BACKEND_PORT%

echo Stopping any existing servers...

:: Kill any process using frontend port
echo Checking for processes on port %FRONTEND_PORT%...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| find ":%FRONTEND_PORT%" ^| find "LISTENING"') do (
    echo Killing frontend process %%a on port %FRONTEND_PORT%
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any process using backend port  
echo Checking for processes on port %BACKEND_PORT%...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| find ":%BACKEND_PORT%" ^| find "LISTENING"') do (
    echo Killing backend process %%a on port %BACKEND_PORT%
    taskkill /F /PID %%a >nul 2>&1
)

:: Wait a moment for processes to close
echo Waiting for processes to close...
timeout /t 3 /nobreak >nul

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo Starting application (frontend on port %FRONTEND_PORT%, backend on port %BACKEND_PORT%)...
npm start

pause