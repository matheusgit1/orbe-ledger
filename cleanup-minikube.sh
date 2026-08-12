#!/bin/bash
# Script para limpar o deploy do Orbe Core Banking do Minikube

set -e

echo "=== Limpando deploy do Orbe Core Banking do Minikube ==="

# Remover todos os recursos Kubernetes
echo "Removendo recursos Kubernetes..."
kubectl delete -k ./k8s

# Remover imagens Docker locais (opcional)
read -p "Deseja remover as imagens Docker locais? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removendo imagens Docker..."
    docker rmi orbe-ledger:latest 2>/dev/null || true
    docker rmi orbe-taxes:latest 2>/dev/null || true
    echo "Imagens removidas."
fi

echo "=== Limpeza concluída! ==="
