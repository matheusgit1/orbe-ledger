#!/bin/bash
# Script para deploy do Orbe Core Banking no Minikube
# Este script constrói as imagens Docker localmente e deploya no Minikube

set -e

echo "=== Deploy Orbe Core Banking no Minikube ==="

# Verificar se o Minikube está rodando
echo "Verificando status do Minikube..."
if ! minikube status &> /dev/null; then
    echo "Minikube não está rodando. Iniciando..."
    minikube start
fi

# Configurar o ambiente Docker para usar o daemon do Minikube
echo "Configurando ambiente Docker para Minikube..."
eval $(minikube docker-env)

# Construir imagem do orbe-ledger
echo "Construindo imagem do orbe-ledger..."
docker build -t orbe-ledger:latest ./orbe-ledger

# Construir imagem do orbe-taxes
echo "Construindo imagem do orbe-taxes..."
docker build -t orbe-taxes:latest ./orbe-taxes

# Aplicar manifests Kubernetes
echo "Aplicando manifests Kubernetes..."
kubectl apply -k ./k8s

# Aguardar os pods ficarem prontos
echo "Aguardando pods ficarem prontos..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=orbe-ledger --timeout=300s
kubectl wait --for=condition=ready pod -l app=orbe-taxes --timeout=300s
kubectl wait --for=condition=ready pod -l app=kong --timeout=300s

# Obter URL do Kong
echo "Obtendo URL do Kong Gateway..."
KONG_URL=$(minikube service kong-service --url)

echo "=== Deploy concluído com sucesso! ==="
echo ""
echo "Serviços disponíveis:"
echo "  Kong Gateway: $KONG_URL"
echo "  Orbe Ledger: $KONG_URL/orbe-ledger"
echo "  Orbe Services: $KONG_URL/orbe-taxes"
echo "  Kong Admin: $(minikube service kong-service --url -n 8001)"
echo ""
echo "Para ver os pods: kubectl get pods"
echo "Para ver os logs: kubectl logs -f <pod-name>"
echo "Para acessar o dashboard: minikube dashboard"
