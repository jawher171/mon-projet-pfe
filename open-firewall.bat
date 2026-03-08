@echo off
echo Opening firewall for Angular dev server (ports 4200-60000)...
netsh advfirewall firewall add rule name="Angular Dev Server" dir=in action=allow protocol=TCP localport=4200-60000 profile=private,public
echo.
if %ERRORLEVEL%==0 (
    echo SUCCESS: Firewall rule added. Your phone can now reach the app.
) else (
    echo FAILED: Please right-click this file and choose "Run as administrator"
)
echo.
pause
