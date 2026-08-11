#!/bin/bash
# Script para remover o Kubernetes Dashboard

set -e

echo "=== Removendo Kubernetes Dashboard ==="

# Remover dashboard
echo "Removendo Kubernetes Dashboard..."
kubectl delete -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Remover usuário admin
echo "Removendo usuário admin..."
kubectl delete serviceaccount dashboard-admin-sa 2>/dev/null || true
kubectl delete clusterrolebinding dashboard-admin-sa 2>/dev/null || true

echo "=== Kubernetes Dashboard removido com sucesso! ==="
