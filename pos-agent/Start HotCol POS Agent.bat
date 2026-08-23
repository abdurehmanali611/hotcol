@echo off
setlocal
title HotCol POS Agent

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this PC.
  echo Install Node.js LTS from https://nodejs.org/ and try again.
  echo.
  pause
  exit /b 1
)

if not exist "server.mjs" (
  echo server.mjs was not found in this folder.
  echo Download server.mjs from Cafe cashier → Printer setup and keep it beside this launcher.
  echo.
  pause
  exit /b 1
)

echo Starting HotCol POS Agent...
echo Keep this window open while the cafe is running.
echo.
node "server.mjs"

echo.
echo HotCol POS Agent stopped.
pause
