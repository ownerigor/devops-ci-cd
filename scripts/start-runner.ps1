$ErrorActionPreference = 'Stop'
$runnerDir = Join-Path $env:USERPROFILE 'actions-runner-etec'
if (-not (Test-Path -LiteralPath (Join-Path $runnerDir '.runner'))) {
    throw "Runner não configurado em $runnerDir."
}
Write-Output 'Mantenha este terminal aberto durante a palestra. Ctrl+C encerra o runner.'
Push-Location $runnerDir
try { & .\run.cmd } finally { Pop-Location }
