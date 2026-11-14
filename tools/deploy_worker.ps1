# Deploy the price/telegram worker with the Cloudflare API.
#
#   $env:CF_API_TOKEN = "<token with Workers Scripts:Edit>"
#   powershell -File tools/deploy_worker.ps1
#
# The token is read from the environment so no secret is ever committed.
# Bindings (KV, Durable Object, secrets IGNAV_API_KEY / TELEGRAM_BOT_TOKEN /
# NOTIFY_KEY / TELEGRAM_WEBHOOK_SECRET / MEZ_USER / MEZ_PASS) are preserved.
param(
  [string]$AccountId = "35174d034bdaea580df295cb23cdf342",
  [string]$ScriptName = "ab-travels-ignav"
)
$ErrorActionPreference = "Stop"
if (-not $env:CF_API_TOKEN) { throw "CF_API_TOKEN environment variable is missing." }
$root = Split-Path -Parent $PSScriptRoot
$worker = Join-Path $root "pricebot-worker.js"
$meta = Join-Path $env:TEMP "abt-worker-meta.json"
[IO.File]::WriteAllText($meta, '{"main_module":"pricebot-worker.js","compatibility_date":"2026-11-01","keep_bindings":["plain_text","secret_text","kv_namespace","durable_object_namespace"]}')
$url = "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/scripts/$ScriptName"
$body = curl.exe -s -X PUT $url -H "Authorization: Bearer $env:CF_API_TOKEN" `
  -F "metadata=@$meta;type=application/json" `
  -F "pricebot-worker.js=@$worker;type=application/javascript+module"
$json = $body | ConvertFrom-Json
if (-not $json.success) { throw ("Deploy failed: " + ($json.errors | ConvertTo-Json -Compress)) }
Write-Output "Deployed $ScriptName (bindings preserved)."
