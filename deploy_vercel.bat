@echo off
title Deploy CasaApp su Vercel
cd /d "%~dp0"
echo ============================================================
echo   Deploy automatico di CasaApp su Vercel
echo ============================================================
echo.
echo 1. Se richiesto, accedi con il tuo account Vercel nel browser.
echo 2. Vercel colleghera' il progetto e lo mettera' online.
echo.
npx vercel --prod
echo.
pause
