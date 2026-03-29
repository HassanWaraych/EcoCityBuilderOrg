@echo off
setlocal EnableDelayedExpansion
title EcoCity Builder - Starting...
color 0A

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\FrontEnd"

set DB_HOST_PORT=5432
set DB_USER=ecocity
set DB_PASSWORD=ecocity
set DB_NAME=ecocity
set BACKEND_PORT=4000
set FRONTEND_PORT=3000

echo.
echo  =========================================================
echo   EcoCity Builder - Local Dev Startup
echo  =========================================================
echo.

:: STEP 1: Check Docker Desktop
echo [1/6] Checking Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker Desktop is not running!
    echo  Please start Docker Desktop, wait for it to fully load,
    echo  then double-click this file again.
    echo.
    pause
    exit /b 1
)
echo  Docker Desktop is running. OK

:: STEP 2: Write backend\.env (always overwrite to ensure correct port)
echo.
echo [2/6] Writing backend\.env (DB port %DB_HOST_PORT%)...
(
    echo PORT=%BACKEND_PORT%
    echo DATABASE_URL=postgres://%DB_USER%:%DB_PASSWORD%@localhost:%DB_HOST_PORT%/%DB_NAME%
    echo JWT_SECRET=dev_jwt_secret_change_me
    echo BCRYPT_ROUNDS=12
    echo CORS_ORIGIN=http://localhost:%FRONTEND_PORT%
) > "%BACKEND%\.env"
echo  backend\.env written. OK

:: STEP 3: Install dependencies if needed
echo.
echo [3/6] Checking dependencies...
if not exist "%BACKEND%\node_modules" (
    echo  Installing backend dependencies...
    cd /d "%BACKEND%"
    npm install >nul 2>&1
    echo  Backend deps installed. OK
) else (
    echo  Backend deps OK
)
if not exist "%FRONTEND%\node_modules" (
    echo  Installing frontend dependencies...
    cd /d "%FRONTEND%"
    npm install >nul 2>&1
    echo  Frontend deps installed. OK
) else (
    echo  Frontend deps OK
)

:: STEP 4: Clean up any leftover containers, then start fresh
echo.
echo [4/6] Stopping any existing containers for this project...
cd /d "%ROOT%"
docker compose down >nul 2>&1
echo  Clean slate ready. OK

:: STEP 5: Start the database
echo.
echo [5/6] Starting PostgreSQL on port %DB_HOST_PORT% (Docker)...
docker compose up -d
if errorlevel 1 (
    echo.
    echo  ERROR: Failed to start the database container.
    echo  Check what is using port %DB_HOST_PORT%:
    echo    netstat -ano ^| findstr ":%DB_HOST_PORT%"
    echo.
    pause
    exit /b 1
)

echo  Waiting for database to accept connections...
set /a RETRIES=15
:wait_db
timeout /t 2 /nobreak >nul
docker compose exec -T db psql -U %DB_USER% -d %DB_NAME% -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
    set /a RETRIES-=1
    if !RETRIES! leq 0 (
        echo.
        echo  ERROR: Database did not become ready in time.
        echo  Run: docker compose logs db
        echo.
        pause
        exit /b 1
    )
    echo  Still waiting... ^(!RETRIES! retries left^)
    goto wait_db
)
echo  Database is ready. OK

:: STEP 6: Start backend and frontend
echo.
echo [6/6] Starting backend and frontend...

start "EcoCity Backend (port %BACKEND_PORT%)" cmd /k "cd /d "%BACKEND%" && npm run dev"
echo  Backend starting in new window...

timeout /t 3 /nobreak >nul

start "EcoCity Frontend (port %FRONTEND_PORT%)" cmd /k "cd /d "%FRONTEND%" && npm run dev"
echo  Frontend starting in new window...

:: Wait for frontend, then open browser
echo.
echo  Waiting for frontend to be ready at http://localhost:%FRONTEND_PORT% ...
set /a FRETRIES=20
:wait_frontend
timeout /t 2 /nobreak >nul
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:%FRONTEND_PORT%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    set /a FRETRIES-=1
    if !FRETRIES! leq 0 goto open_browser
    echo  Still waiting... ^(!FRETRIES! retries left^)
    goto wait_frontend
)

:open_browser
echo.
echo  Opening browser...
start "" "http://localhost:%FRONTEND_PORT%"

echo.
echo  =========================================================
echo   All services are up!
echo.
echo   Frontend  -^>  http://localhost:%FRONTEND_PORT%
echo   Backend   -^>  http://localhost:%BACKEND_PORT%
echo   Database  -^>  localhost:%DB_HOST_PORT% (Docker)
echo.
echo   Close the backend ^& frontend windows to stop them.
echo   To stop the database:  docker compose down
echo  =========================================================
echo.
pause
