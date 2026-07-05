@echo off

:: Start Nodejs
cd /d "F:\Node Projects\Pile-Tracker\api\"
start "Start Node Server" cmd /k "npm run dev"

:: Start Client
cd /d "F:\Node Projects\Pile-Tracker\client\"
start "Start React Server" cmd /k "npm run dev"

exit