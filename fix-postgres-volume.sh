#!/bin/bash
# Script para corrigir o problema de volume do PostgreSQL
# Este script remove o PVC existente e recria com a configuração correta

set -e

echo "=== Corrigindo configuração do PostgreSQL ==="

echo "AVISO: Isso vai remover o PVC existente e todos os dados do PostgreSQL!"
echo "Os dados serão perdidos. Deseja continuar? (y/n)"
read -p "" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 0
fi

# Remover deployment do PostgreSQL
echo "Removendo deployment do PostgreSQL..."
kubectl delete deployment postgres 2>/dev/null || true

# Remover o PVC existente
echo "Removendo PVC existente..."
kubectl delete pvc postgres-pvc 2>/dev/null || true

# Reaplicar os manifests
echo "Reaplicando manifests Kubernetes..."
kubectl apply -k ./k8s

# Aguardar o PostgreSQL ficar pronto
echo "Aguardando PostgreSQL ficar pronto..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s

echo "=== PostgreSQL corrigido com sucesso! ==="
echo ""
echo "O PostgreSQL agora está usando a configuração correta de volume."
