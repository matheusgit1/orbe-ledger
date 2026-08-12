# Script para deploy do Orbe Core Banking no Kubernetes do Docker Desktop
# Este script constrói as imagens Docker localmente e deploya no K8s do Docker Desktop

Write-Host "=== Deploy Orbe Core Banking no Kubernetes do Docker Desktop ===" -ForegroundColor Green

# Verificar se o Kubernetes do Docker Desktop está habilitado
Write-Host "Verificando status do Kubernetes do Docker Desktop..." -ForegroundColor Yellow
try {
    $k8sStatus = kubectl cluster-info
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Kubernetes do Docker Desktop não está rodando ou habilitado." -ForegroundColor Red
        Write-Host "Por favor:" -ForegroundColor Yellow
        Write-Host "1. Abra o Docker Desktop" -ForegroundColor Yellow
        Write-Host "2. Vá em Settings > Kubernetes" -ForegroundColor Yellow
        Write-Host "3. Habilite 'Enable Kubernetes'" -ForegroundColor Yellow
        Write-Host "4. Clique em 'Apply & Restart'" -ForegroundColor Yellow
        Write-Host "5. Aguarde o Kubernetes iniciar e execute este script novamente" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "kubectl não está instalado ou configurado." -ForegroundColor Red
    Write-Host "Por favor, instale o kubectl ou habilite o Kubernetes no Docker Desktop." -ForegroundColor Yellow
    exit 1
}

Write-Host "Kubernetes está rodando!" -ForegroundColor Green

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

Write-Host "=== Deploy concluído com sucesso! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Serviços disponíveis:" -ForegroundColor Cyan
Write-Host "  Kong Gateway: http://localhost:30080"
Write-Host "  Orbe Ledger: http://localhost:30080/orbe-ledger"
Write-Host "  Orbe Services: http://localhost:30080/orbe-taxes"
Write-Host "  Kong Admin: http://localhost:30081"
Write-Host ""
Write-Host "Para ver os pods: kubectl get pods" -ForegroundColor Yellow
Write-Host "Para ver os serviços: kubectl get services" -ForegroundColor Yellow
Write-Host "Para ver os logs: kubectl logs -f <pod-name>" -ForegroundColor Yellow
Write-Host "Para limpar o deploy: .\cleanup-docker-k8s.ps1" -ForegroundColor Yellow
