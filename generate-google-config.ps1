param(
  [string]$EnvFile = (Join-Path $PSScriptRoot ".env")
)

$values = @{}
if (Test-Path -LiteralPath $EnvFile) {
  foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
      continue
    }
    $parts = $trimmed.Split(@("="), 2, [System.StringSplitOptions]::None)
    $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
  }
}

$endpoint = [System.Environment]::GetEnvironmentVariable("GOOGLE_APPS_SCRIPT_WEB_APP_URL")
if (-not $endpoint) {
  $endpoint = [string]$values["GOOGLE_APPS_SCRIPT_WEB_APP_URL"]
}
$endpoint = $endpoint.Trim()

if ($endpoint -and $endpoint -notmatch '^https://script\.google\.com/macros/s/[^/]+/exec$') {
  throw "GOOGLE_APPS_SCRIPT_WEB_APP_URL must be a public Google Apps Script /exec URL."
}

$escapedEndpoint = $endpoint.Replace("\", "\\").Replace('"', '\"')
$content = @"
window.HOT_HOST_CONFIG = Object.freeze({
  // Public Apps Script /exec URL. Private Google IDs stay in Script Properties.
  googleAppsScriptEndpoint: "$escapedEndpoint"
});
"@
$content += [System.Environment]::NewLine

$configPath = Join-Path (Join-Path $PSScriptRoot "assets") "config.js"
$encoding = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configPath, $content, $encoding)
