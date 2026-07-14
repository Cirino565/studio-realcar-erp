$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "O comando '$Name' não foi encontrado. Instale-o e abra um novo PowerShell antes de continuar."
  }
}

Require-Command "npm"
Require-Command "git"

Write-Host "`n[1/4] Validando o projeto..." -ForegroundColor Cyan
npm run build

Write-Host "`n[2/4] Preparando as alterações no Git..." -ForegroundColor Cyan
git add .

$Changes = git status --porcelain
if ($Changes) {
  $DefaultMessage = "finalize premium crm experience"
  $CommitMessage = Read-Host "Mensagem do commit (Enter para usar '$DefaultMessage')"

  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = $DefaultMessage
  }

  git commit -m $CommitMessage
}
else {
  Write-Host "Nenhuma alteração nova para criar commit." -ForegroundColor Yellow
}

Write-Host "`n[3/4] Enviando para o GitHub..." -ForegroundColor Cyan
$Branch = (git branch --show-current).Trim()

if ([string]::IsNullOrWhiteSpace($Branch)) {
  throw "Não foi possível identificar a branch atual do Git."
}

git push origin $Branch

Write-Host "`n[4/4] Concluído." -ForegroundColor Green
Write-Host "Branch enviada: $Branch"
Write-Host "Acompanhe o novo deploy no Railway e confirme que ele usa o último commit desta branch."
