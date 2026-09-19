$ErrorActionPreference = 'Stop'
$runnerDir = Join-Path $env:USERPROFILE 'actions-runner-etec'
if (-not (Test-Path -LiteralPath (Join-Path $runnerDir '.runner'))) {
    throw "Runner não configurado em $runnerDir."
}
Write-Output 'Runner em execução...'
Push-Location $runnerDir
try { & .\run.cmd } finally { Pop-Location }
