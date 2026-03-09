#Requires -Version 5.1
<#
.SYNOPSIS
    Heartbeat simulation script for AlgoStudio production canary testing.

.DESCRIPTION
    Sends 20 POST requests to the heartbeat endpoint with 12-18s random jitter.
    Stops on non-200 status or rate limit (429).

.NOTES
    Required env vars:
      INTERNAL_API_KEY    - Production API key (never printed)
      CANARY_STRATEGY_ID  - Strategy ID to poll (e.g. "AS-10F10DCA")
#>

$ErrorActionPreference = "Stop"

# ── Config ────────────────────────────────────────────────
$BaseUrl        = "https://algo-studio.com/api/internal/heartbeat"
$TotalRequests  = 20
$MinDelaySec    = 12
$MaxDelaySec    = 18

# ── Validate env vars ─────────────────────────────────────
$ApiKey = $env:INTERNAL_API_KEY
if (-not $ApiKey) {
    Write-Error "INTERNAL_API_KEY is not set. Export it before running this script."
    exit 1
}

$StrategyId = $env:CANARY_STRATEGY_ID
if (-not $StrategyId) {
    Write-Error "CANARY_STRATEGY_ID is not set. Export it before running this script."
    exit 1
}

Write-Host "=== AlgoStudio Heartbeat Canary Test ===" -ForegroundColor Cyan
Write-Host "Endpoint   : $BaseUrl"
Write-Host "StrategyId : $StrategyId"
Write-Host "Requests   : $TotalRequests"
Write-Host "Jitter     : ${MinDelaySec}-${MaxDelaySec}s"
Write-Host "API Key    : ****** (${($ApiKey.Length)} chars, not printed)"
Write-Host ""

# ── Tracking ──────────────────────────────────────────────
$results      = @()
$actionCounts = @{}
$reasonCounts = @{}
$anomalies    = @()
$rng          = New-Object System.Random

# ── Request loop ──────────────────────────────────────────
for ($i = 1; $i -le $TotalRequests; $i++) {

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $body = @{ strategyId = $StrategyId } | ConvertTo-Json -Compress

    try {
        $response = Invoke-WebRequest -Uri $BaseUrl -Method POST `
            -Headers @{
                "x-internal-api-key" = $ApiKey
                "Content-Type"       = "application/json"
            } `
            -Body $body `
            -UseBasicParsing

        $statusCode = $response.StatusCode
        $json       = $response.Content | ConvertFrom-Json
        $action     = $json.action
        $reasonCode = $json.reasonCode

    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if (-not $statusCode) { $statusCode = 0 }
        $action     = "ERROR"
        $reasonCode = "HTTP_$statusCode"

        # Try to parse error body
        try {
            $errStream = $_.Exception.Response.GetResponseStream()
            $reader    = New-Object System.IO.StreamReader($errStream)
            $errBody   = $reader.ReadToEnd() | ConvertFrom-Json
            if ($errBody.reasonCode) { $reasonCode = $errBody.reasonCode }
        } catch {}
    }

    # Log line
    $logLine = "$timestamp | req=$i/$TotalRequests | status=$statusCode | action=$action | reason=$reasonCode"
    if ($statusCode -eq 200) {
        Write-Host $logLine -ForegroundColor Green
    } else {
        Write-Host $logLine -ForegroundColor Red
    }

    # Track
    $results += [PSCustomObject]@{
        Request    = $i
        Timestamp  = $timestamp
        Status     = $statusCode
        Action     = $action
        ReasonCode = $reasonCode
    }

    if (-not $actionCounts.ContainsKey($action)) { $actionCounts[$action] = 0 }
    $actionCounts[$action]++

    if (-not $reasonCounts.ContainsKey($reasonCode)) { $reasonCounts[$reasonCode] = 0 }
    $reasonCounts[$reasonCode]++

    # Anomaly detection: inconsistent responses
    if ($i -gt 1 -and $results[-1].Action -ne $results[-2].Action) {
        $anomalies += "Request $i: action changed from $($results[-2].Action) to $($results[-1].Action)"
    }

    # Stop conditions
    if ($statusCode -eq 429) {
        Write-Host ""
        Write-Host "STOP: Rate limited (429). Halting to avoid further throttling." -ForegroundColor Red
        $anomalies += "Rate limited at request $i"
        break
    }

    if ($statusCode -ne 200) {
        Write-Host ""
        Write-Host "STOP: Non-200 status ($statusCode). Halting." -ForegroundColor Red
        $anomalies += "Non-200 status ($statusCode) at request $i"
        break
    }

    # Jitter delay (skip after last request)
    if ($i -lt $TotalRequests) {
        $delay = $rng.Next($MinDelaySec, $MaxDelaySec + 1)
        Write-Host "  waiting ${delay}s..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $delay
    }
}

# ── Summary ───────────────────────────────────────────────
Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Requests sent : $($results.Count) / $TotalRequests"
Write-Host ""

Write-Host "Actions:" -ForegroundColor Yellow
foreach ($kv in $actionCounts.GetEnumerator() | Sort-Object Name) {
    Write-Host "  $($kv.Name) : $($kv.Value)"
}
Write-Host ""

Write-Host "ReasonCodes:" -ForegroundColor Yellow
foreach ($kv in $reasonCounts.GetEnumerator() | Sort-Object Name) {
    Write-Host "  $($kv.Name) : $($kv.Value)"
}
Write-Host ""

if ($anomalies.Count -eq 0) {
    Write-Host "Anomalies: NONE" -ForegroundColor Green
} else {
    Write-Host "Anomalies: $($anomalies.Count) detected" -ForegroundColor Red
    foreach ($a in $anomalies) {
        Write-Host "  - $a" -ForegroundColor Red
    }
}

Write-Host ""

# Final verdict
$allOk = ($results | Where-Object { $_.Status -ne 200 }).Count -eq 0
$consistent = $anomalies.Count -eq 0
if ($allOk -and $consistent) {
    Write-Host "VERDICT: PASS - All $($results.Count) heartbeats returned 200 with consistent responses." -ForegroundColor Green
} elseif ($allOk) {
    Write-Host "VERDICT: WARN - All 200 but responses were inconsistent (see anomalies)." -ForegroundColor Yellow
} else {
    Write-Host "VERDICT: FAIL - Non-200 responses detected." -ForegroundColor Red
}
