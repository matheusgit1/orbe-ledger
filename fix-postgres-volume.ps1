# Script para corrigir o problema de volume do PostgreSQL
# Este script remove o PVC existente e recria com a configuração correta

Write-Host "=== Corrigindo configuração do PostgreSQL ===" -ForegroundColor Green

Write-Host "AVISO: Isso vai remover o PVC existente e todos os dados do PostgreSQL!" -ForegroundColor Red
Write-Host "Os dados serão perdidos. Deseja continuar? (y/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -ne 'y' -and $response -ne 'Y') {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

# Remover deployment do PostgreSQL
Write-Host "Removendo deployment do PostgreSQL..." -ForegroundColor Yellow
kubectl delete deployment postgres 2>$null

# Remover o PVC existente
Write-Host "Removendo PVC existente..." -ForegroundColor Yellow
kubectl delete pvc postgres-pvc 2>$null

# Reaplicar os manifests
Write-Host "Reaplicando manifests Kubernetes..." -ForegroundColor Yellow
kubectl apply -k ./k8s

# Aguardar o PostgreSQL ficar pronto
Write-Host "Aguardando PostgreSQL ficar pronto..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s

Write-Host "=== PostgreSQL corrigido com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "O PostgreSQL agora está usando a configuração correta de volume." -ForegroundColor Cyan
