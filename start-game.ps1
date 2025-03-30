# Start HTTP server without caching and open browser
Set-Location -Path "C:\candy-game"
Start-Process -FilePath "npx" -ArgumentList "http-server", "-c-1", "-p", "8080"
Start-Sleep -Seconds 2
Start-Process "http://localhost:8080" 