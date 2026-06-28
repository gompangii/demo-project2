<#
.SYNOPSIS
  검증 게이트 — lint · typecheck · test · build 를 한 번에 순차 실행.

.DESCRIPTION
  과거 세션에서 lint/test/build 를 매번 따로 돌리며 우왕좌왕하던 흐름을 하나로 묶는다.
  각 단계를 순서대로 실행하고 첫 실패에서 멈춘다(비0 종료코드). 끝에 단계별 요약을 출력한다.

.EXAMPLE
  pwsh scripts/check.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root

$steps = @(
  @{ Name = "lint";      Cmd = { npm run lint } }
  @{ Name = "typecheck"; Cmd = { npx tsc --noEmit } }
  @{ Name = "test";      Cmd = { npm test } }
  @{ Name = "build";     Cmd = { npm run build } }
)

# ESLint 설정이 없으면 `next lint` 가 대화형 프롬프트로 멈추므로 lint 단계를 건너뛴다.
$eslintConfigured = (Get-ChildItem -Path $root -Filter ".eslintrc*" -ErrorAction SilentlyContinue) -or
                    (Get-ChildItem -Path $root -Filter "eslint.config.*" -ErrorAction SilentlyContinue) -or
                    ((Get-Content (Join-Path $root "package.json") -Raw) -match '"eslintConfig"')

$results = @()
$failed = $false
foreach ($s in $steps) {
  if ($s.Name -eq "lint" -and -not $eslintConfigured) {
    Write-Host ""
    Write-Host "═══ lint ═══" -ForegroundColor Cyan
    Write-Host "⚠ ESLint 설정이 없어 건너뜀 (next lint 대화형 프롬프트 방지). 설정하려면: npm run lint 후 'Strict' 선택" -ForegroundColor Yellow
    $results += [pscustomobject]@{ Step = "lint"; Status = "⚠ SKIP (미설정)" }
    continue
  }
  Write-Host ""
  Write-Host "═══ $($s.Name) ═══" -ForegroundColor Cyan
  & $s.Cmd
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    $results += [pscustomobject]@{ Step = $s.Name; Status = "❌ FAIL ($code)" }
    $failed = $true
    break
  }
  $results += [pscustomobject]@{ Step = $s.Name; Status = "✅ PASS" }
}

Write-Host ""
Write-Host "═══ 요약 ═══" -ForegroundColor Cyan
$results | ForEach-Object { Write-Host ("  {0,-10} {1}" -f $_.Step, $_.Status) }
if ($failed) {
  $remaining = $steps.Count - $results.Count
  if ($remaining -gt 0) { Write-Host "  (이후 $remaining 단계는 건너뜀)" -ForegroundColor DarkGray }
}

Pop-Location
if ($failed) { exit 1 } else { Write-Host "`n전체 통과 🎉" -ForegroundColor Green; exit 0 }
