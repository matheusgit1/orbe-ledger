# Script para deploy do Orbe Core Banking no Minikube
# Este script constrói as imagens Docker localmente e deploya no Minikube

Write-Host "=== Deploy Orbe Core Banking no Minikube ===" -ForegroundColor Green

# Verificar se o Minikube está rodando
Write-Host "Verificando status do Minikube..." -ForegroundColor Yellow
$minikubeStatus = minikube status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Minikube não está rodando. Iniciando..." -ForegroundColor Yellow
    minikube start
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao iniciar Minikube. Por favor, inicie manualmente com 'minikube start'" -ForegroundColor Red
        exit 1
    }
}

# Configurar o ambiente Docker para usar o daemon do Minikube
Write-Host "Configurando ambiente Docker para Minikube..." -ForegroundColor Yellow
& minikube docker-powershell

# Construir imagem do orbe-ledger
Write-Host "Construindo imagem do orbe-ledger..." -ForegroundColor Yellow
docker build -t orbe-ledger:latest ./orbe-ledger
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao construir imagem do orbe-ledger" -ForegroundColor Red
    exit 1
}

# Construir imagem do orbe-taxes
Write-Host "Construindo imagem do orbe-taxes..." -ForegroundColor Yellow
docker build -t orbe-taxes:latest ./orbe-taxes
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao construir imagem do orbe-taxes" -ForegroundColor Red
    exit 1
}

# Aplicar manifests Kubernetes
Write-Host "Aplicando manifests Kubernetes..." -ForegroundColor Yellow
kubectl apply -k ./k8s
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao aplicar manifests Kubernetes" -ForegroundColor Red
    exit 1
}

# Aguardar os pods ficarem prontos
Write-Host "Aguardando pods ficarem prontos..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl wait --for=condition=ready pod -l app=orbe-ledger --timeout=300s
kubectl wait --for=condition=ready pod -l app=orbe-taxes --timeout=300s
kubectl wait --for=condition=ready pod -l app=kong --timeout=300s

# Obter URL do Kong
Write-Host "Obtendo URL do Kong Gateway..." -ForegroundColor Yellow
$kongUrl = minikube service kong-service --url

Write-Host "=== Deploy concluído com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Serviços disponíveis:" -ForegroundColor Cyan
Write-Host "  Kong Gateway: $kongUrl"
Write-Host "  Orbe Ledger: $kongUrl/orbe-ledger"
Write-Host "  Orbe Services: $kongUrl/orbe-taxes"
Write-Host "  Kong Admin: $(minikube service kong-service --url -n 8001)"
Write-Host ""
Write-Host "Para ver os pods: kubectl get pods" -ForegroundColor Yellow
Write-Host "Para ver os logs: kubectl logs -f <pod-name>" -ForegroundColor Yellow
Write-Host "Para acessar o dashboard: minikube dashboard" -ForegroundColor Yellow
