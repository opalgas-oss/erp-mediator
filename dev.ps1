# dev.ps1 - Auto-restart server kalau crash
# Cara pakai: klik kanan -> Run with PowerShell

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Set-Location -Path "D:\Philips\Project\erp-mediator"

Write-Host "Folder aktif: $(Get-Location)" -ForegroundColor Gray
Write-Host "Server ERP Mediator - Auto-restart aktif" -ForegroundColor Green

while ($true) {
    Write-Host "Menjalankan npm run dev..." -ForegroundColor Cyan
    npm run dev
    Write-Host "Server berhenti. Restart dalam 3 detik..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}