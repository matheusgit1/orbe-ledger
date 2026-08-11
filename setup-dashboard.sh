#!/bin/bash
# Script para configurar e acessar o Kubernetes Dashboard
# Este script instala o dashboard, cria usuário admin e inicia o proxy

set -e

echo "=== Configurando Kubernetes Dashboard ==="

# Verificar se o kubectl está funcionando
echo "Verificando conexão com o cluster..."
if ! kubectl cluster-info &> /dev/null; then
    echo "Não foi possível conectar ao cluster Kubernetes."
    echo "Verifique se o Kubernetes está rodando (Docker Desktop ou Minikube)."
    exit 1
fi
echo "Cluster conectado com sucesso!"

# Instalar o dashboard
echo "Instalando Kubernetes Dashboard..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
echo "Dashboard instalado!"

# Criar usuário admin
echo "Criando usuário admin..."
kubectl create serviceaccount dashboard-admin-sa 2>/dev/null || true
kubectl create clusterrolebinding dashboard-admin-sa --clusterrole=cluster-admin --serviceaccount=default:dashboard-admin-sa 2>/dev/null || true
echo "Usuário admin criado!"

# Obter token
echo "Gerando token de acesso..."
TOKEN=$(kubectl create token dashboard-admin-sa)
echo "Token gerado!"

# Mostrar informações
echo ""
echo "=== Dashboard configurado com sucesso! ==="
echo ""
echo "Token de acesso:"
echo "$TOKEN"
echo ""
echo "Para acessar o dashboard:"
echo "1. Execute: kubectl proxy"
echo "2. Acesse no navegador: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/"
echo "3. Use o token acima para fazer login"
echo ""
read -p "Deseja iniciar o proxy agora? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Iniciando proxy..."
    echo "Pressione Ctrl+C para parar o proxy"
    kubectl proxy
fi
