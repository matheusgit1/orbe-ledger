# Script para limpar o deploy do Orbe Core Banking do Kubernetes do Docker Desktop

Write-Host "=== Limpando deploy do Orbe Core Banking do Kubernetes do Docker Desktop ===" -ForegroundColor Green

# Remover todos os recursos Kubernetes
Write-Host "Removendo recursos Kubernetes..." -ForegroundColor Yellow
kubectl delete -k ./k8s

# Remover imagens Docker locais (opcional)
Write-Host "Deseja remover as imagens Docker locais? (y/n)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Removendo imagens Docker..." -ForegroundColor Yellow
    docker rmi orbe-ledger:latest 2>$null
    docker rmi orbe-services:latest 2>$null
    Write-Host "Imagens removidas." -ForegroundColor Green
}

Write-Host "=== Limpeza concluída! ===" -ForegroundColor Green
