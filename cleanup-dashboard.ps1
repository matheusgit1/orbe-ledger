# Script para remover o Kubernetes Dashboard

Write-Host "=== Removendo Kubernetes Dashboard ===" -ForegroundColor Green

# Remover dashboard
Write-Host "Removendo Kubernetes Dashboard..." -ForegroundColor Yellow
kubectl delete -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Remover usuário admin
Write-Host "Removendo usuário admin..." -ForegroundColor Yellow
kubectl delete serviceaccount dashboard-admin-sa 2>$null
kubectl delete clusterrolebinding dashboard-admin-sa 2>$null

Write-Host "=== Kubernetes Dashboard removido com sucesso! ===" -ForegroundColor Green
