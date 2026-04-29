# =============================================
# Template Setup Script
# Ejecuta esto UNA VEZ en cada proyecto nuevo
# =============================================

param(
    [string]$ProjectName = ""
)

if ($ProjectName -eq "") {
    $ProjectName = Read-Host "Nombre del proyecto"
}

Write-Host "`n[1/4] Creando proyecto Next.js..." -ForegroundColor Cyan
npx create-next-app@latest $ProjectName --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes

Set-Location $ProjectName

Write-Host "`n[2/4] Instalando shadcn/ui..." -ForegroundColor Cyan
npx shadcn@latest init --defaults

Write-Host "`n[3/4] Instalando UX Pro Max skill..." -ForegroundColor Cyan
npx uipro-cli init --ai claude

Write-Host "`n[4/4] Copiando config MCP de 21st.dev..." -ForegroundColor Cyan
Copy-Item "$PSScriptRoot\.mcp.json" ".mcp.json"

Write-Host "`n✅ Listo! Abre la carpeta en VS Code:" -ForegroundColor Green
Write-Host "   code $ProjectName" -ForegroundColor Yellow
