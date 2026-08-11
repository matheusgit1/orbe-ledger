# Script para configurar e acessar o Kubernetes Dashboard
# Este script instala o dashboard, cria usuário admin e inicia o proxy

Write-Host "=== Configurando Kubernetes Dashboard ===" -ForegroundColor Green

# Verificar se o kubectl está funcionando
Write-Host "Verificando conexão com o cluster..." -ForegroundColor Yellow
try {
    $clusterInfo = kubectl cluster-info
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Não foi possível conectar ao cluster Kubernetes." -ForegroundColor Red
        Write-Host "Verifique se o Kubernetes está rodando (Docker Desktop ou Minikube)." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Cluster conectado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "kubectl não está instalado ou configurado." -ForegroundColor Red
    exit 1
}

# Instalar o dashboard
Write-Host "Instalando Kubernetes Dashboard..." -ForegroundColor Yellow
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao instalar o dashboard." -ForegroundColor Red
    exit 1
}
Write-Host "Dashboard instalado!" -ForegroundColor Green

# Criar usuário admin
Write-Host "Criando usuário admin..." -ForegroundColor Yellow
kubectl create serviceaccount dashboard-admin-sa 2>$null
kubectl create clusterrolebinding dashboard-admin-sa --clusterrole=cluster-admin --serviceaccount=default:dashboard-admin-sa 2>$null
Write-Host "Usuário admin criado!" -ForegroundColor Green

# Obter token
Write-Host "Gerando token de acesso..." -ForegroundColor Yellow
$token = kubectl create token dashboard-admin-sa
Write-Host "Token gerado!" -ForegroundColor Green

# Mostrar informações
Write-Host ""
Write-Host "=== Dashboard configurado com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Token de acesso:" -ForegroundColor Cyan
Write-Host $token
Write-Host ""
Write-Host "Para acessar o dashboard:" -ForegroundColor Yellow
Write-Host "1. Execute: kubectl proxy" -ForegroundColor Yellow
Write-Host "2. Acesse no navegador: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/" -ForegroundColor Yellow
Write-Host "3. Use o token acima para fazer login" -ForegroundColor Yellow
Write-Host ""
Write-Host "Deseja iniciar o proxy agora? (y/n)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "Iniciando proxy..." -ForegroundColor Yellow
    Write-Host "Pressione Ctrl+C para parar o proxy" -ForegroundColor Yellow
    kubectl proxy
}
