param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-f0-9]{40}$')]
    [string]$CommitSha
)

$ErrorActionPreference = 'Stop'
$dockerBin = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'
if (Test-Path -LiteralPath $dockerBin) { $env:Path = "$dockerBin;$env:Path" }

function Invoke-Docker {
    & docker @args
    if ($LASTEXITCODE -ne 0) { throw "Docker falhou: $args" }
}

$containerName = 'devops-tasks-api'
$image = "devops-tasks-api:$CommitSha"
Invoke-Docker version

# Construir primeiro: uma falha de build mantém a versão anterior em execução.
Invoke-Docker build --label "org.opencontainers.image.revision=$CommitSha" -t $image .

# Substituir somente o contêiner desta aplicação. Os dados em memória são apagados.
$existing = Invoke-Docker ps -a --filter "name=^/$containerName$" --format '{{.Names}}'
if ($existing -eq $containerName) {
    Invoke-Docker stop $containerName
    # Contêineres iniciados com --rm desaparecem automaticamente ao parar.
    $remaining = Invoke-Docker ps -a --filter "name=^/$containerName$" --format '{{.Names}}'
    if ($remaining -eq $containerName) { Invoke-Docker rm $containerName }
}
Invoke-Docker run -d --name $containerName --restart unless-stopped -p 127.0.0.1:3000:3000 $image

for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 3
        if ($health.status -eq 'ok' -and $health.application -eq 'devops-tasks-api') {
            Write-Output "Deploy aprovado: $image em http://localhost:3000/health"
            return
        }
    } catch {
        Write-Output "Aguardando a API iniciar ($attempt/20)..."
    }
    Start-Sleep -Seconds 2
}
Invoke-Docker logs --tail 50 $containerName
throw 'Deploy falhou: /health não confirmou uma aplicação saudável.'
