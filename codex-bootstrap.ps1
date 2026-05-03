param(
  [string]$ProjectPath = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

$skillRoot = 'C:\Users\hijue\.codex\skills\multi-agent-orchestration'
$bootstrapScript = Join-Path $skillRoot 'scripts\bootstrap_project.ps1'

if (-not (Test-Path $bootstrapScript)) {
  throw "Bootstrap script not found: $bootstrapScript"
}

Write-Host "[codex-bootstrap] Bootstrapping global orchestration scaffold in: $ProjectPath"
& $bootstrapScript -ProjectPath $ProjectPath

Write-Host "[codex-bootstrap] Scaffold ready."
Write-Host "[codex-bootstrap] Next: update .codex-orchestration/project-context.md and .codex-orchestration/agents/*.md with merged backend/web/mobile context."
