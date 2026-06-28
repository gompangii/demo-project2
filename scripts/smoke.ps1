<#
.SYNOPSIS
  /api/analyze 엔드투엔드 스모크 테스트.

.DESCRIPTION
  과거 세션에서 OpenAI 연동을 확인하려고 임시 라우트(app/api/_partest)를 만들고 지우던
  일회성 댄스를 영구 대체한다. 샘플 messages 를 /api/analyze 에 POST 하고 응답이
  AnalysisResult 계약(summary + 4개 배열 + analyzedCount/totalCount)을 만족하는지 검증한다.

.PARAMETER BaseUrl
  앱 베이스 URL. 기본 http://localhost:3000

.PARAMETER Start
  지정하면 스크립트가 직접 `npm run dev` 를 백그라운드로 띄우고, 검증 후 내려준다.
  미지정 시 BaseUrl 에 이미 떠 있는 서버를 사용한다.

.PARAMETER Limit
  분석 대상 최근 메시지 수. 기본 100.

.EXAMPLE
  pwsh scripts/smoke.ps1 -Start
  pwsh scripts/smoke.ps1 -BaseUrl http://localhost:3100
#>
[CmdletBinding()]
param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$Start,
  [int]$Limit = 100
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$BaseUrl = $BaseUrl.TrimEnd("/")

function Write-Step($m) { Write-Host "▶ $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "✅ $m" -ForegroundColor Green }
function Write-Fail($m) { Write-Host "❌ $m" -ForegroundColor Red }

# ── 1) OPENAI_API_KEY 확인 ────────────────────────────────────────────
$envPath = Join-Path $root ".env.local"
if (-not (Test-Path $envPath)) {
  Write-Fail ".env.local 이 없습니다. copy .env.local.example .env.local 후 키를 입력하세요."
  exit 1
}
$keyLine = Get-Content $envPath | Where-Object { $_ -match "^\s*OPENAI_API_KEY\s*=" } | Select-Object -First 1
$key = ""
if ($keyLine) { $key = ($keyLine -replace "^\s*OPENAI_API_KEY\s*=", "").Trim().Trim('"') }
if (-not $key -or $key.StartsWith("sk-...")) {
  Write-Fail "OPENAI_API_KEY 가 비어있거나 플레이스홀더(sk-...)입니다. 실제 키를 .env.local 에 넣으세요."
  exit 1
}
Write-Ok "OPENAI_API_KEY 확인됨"

# ── 2) 필요 시 dev 서버 기동 + readiness 폴링 ─────────────────────────
$serverProc = $null
$port = ([Uri]$BaseUrl).Port

function Get-PortPid($p) {
  try { (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop | Select-Object -First 1).OwningProcess }
  catch { $null }
}

if ($Start) {
  Write-Step "dev 서버 기동 (port $port)"
  $serverProc = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "set PORT=$port && npm run dev" `
    -WorkingDirectory $root -WindowStyle Hidden -PassThru
}

Write-Step "서버 readiness 폴링: $BaseUrl"
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
  try {
    Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -TimeoutSec 3 | Out-Null
    $ready = $true; break
  } catch {
    # 서버가 200 외 상태여도(예: 404) 응답이 오면 떠 있는 것
    if ($_.Exception.Response) { $ready = $true; break }
    Start-Sleep -Milliseconds 1000
  }
}
if (-not $ready) {
  Write-Fail "서버가 $BaseUrl 에서 60초 내 응답하지 않음"
  if ($serverProc) { $lp = Get-PortPid $port; if ($lp) { Stop-Process -Id $lp -Force -ErrorAction SilentlyContinue } }
  exit 1
}
Write-Ok "서버 응답 확인"

# ── 3) /api/analyze POST ──────────────────────────────────────────────
$payload = @{
  limit = $Limit
  messages = @(
    @{ timestamp = "2024-11-18 16:47"; sender = "민수"; message = "다음주 정기모임 장소를 정해야 할 것 같아요"; isSystem = $false }
    @{ timestamp = "2024-11-18 16:48"; sender = "영희"; message = "강남역 근처 스터디카페 추천해요"; isSystem = $false }
    @{ timestamp = "2024-11-18 16:50"; sender = "민수"; message = "그럼 투표로 정하죠. 제가 폼 만들어서 공유할게요"; isSystem = $false }
    @{ timestamp = "2024-11-18 17:01"; sender = "민수"; message = "발표 자료는 제가 금요일까지 초안 공유하겠습니다"; isSystem = $false }
    @{ timestamp = "2024-11-18 17:03"; sender = "수진"; message = "혹시 주차 가능한 곳인지도 확인 부탁드려요"; isSystem = $false }
  )
}
$json = $payload | ConvertTo-Json -Depth 5
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

$exit = 0
try {
  Write-Step "POST $BaseUrl/api/analyze (messages=$($payload.messages.Count), limit=$Limit)"
  $resp = Invoke-RestMethod -Uri "$BaseUrl/api/analyze" -Method Post `
    -ContentType "application/json; charset=utf-8" -Body $bytes -TimeoutSec 120

  # ── 4) AnalysisResult 계약 검증 ────────────────────────────────────
  $problems = @()
  if (-not $resp.summary -or $resp.summary.Trim().Length -eq 0) { $problems += "summary 가 비어있음" }
  foreach ($f in @("keyTopics", "actionItems", "openQuestions")) {
    if ($null -eq $resp.$f -or -not ($resp.$f -is [System.Array] -or $resp.$f -is [System.Collections.IEnumerable])) {
      $problems += "$f 가 배열이 아님"
    }
  }
  if ($null -eq $resp.analyzedCount) { $problems += "analyzedCount 누락" }
  if ($null -eq $resp.totalCount)    { $problems += "totalCount 누락" }

  if ($problems.Count -gt 0) {
    Write-Fail "응답이 AnalysisResult 계약을 어김:"
    $problems | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host ($resp | ConvertTo-Json -Depth 5)
    $exit = 1
  } else {
    Write-Ok "PASS — AnalysisResult 계약 충족"
    Write-Host "   summary      : $($resp.summary.Substring(0, [Math]::Min(80, $resp.summary.Length)))..."
    Write-Host "   keyTopics    : $($resp.keyTopics.Count)개"
    Write-Host "   actionItems  : $($resp.actionItems.Count)개"
    Write-Host "   openQuestions: $($resp.openQuestions.Count)개"
    Write-Host "   analyzed/total: $($resp.analyzedCount)/$($resp.totalCount)"
  }
} catch {
  Write-Fail "요청 실패: $($_.Exception.Message)"
  $exit = 1
} finally {
  if ($serverProc) {
    Write-Step "dev 서버 종료"
    $lp = Get-PortPid $port
    if ($lp) { Stop-Process -Id $lp -Force -ErrorAction SilentlyContinue }
    Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue
  }
}

exit $exit
