param(
    [string]$Python = 'python',
    [int]$Port = 8000,
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv/Scripts/python.exe')) {
    $version = & $Python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}'); assert (3, 10) <= sys.version_info[:2] < (3, 14), 'Use Python 3.10 through 3.13 for the saved scikit-learn 1.6.1 model.'"
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.10-3.13 is required. Pass -Python with the path to a compatible python.exe.' }
    & $Python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python environment.' }
}
& ./.venv/Scripts/python.exe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Could not install backend dependencies.' }
if (-not $SkipBuild) {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Could not install frontend dependencies.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The frontend build failed.' }
}
Write-Host "Workwell is starting at http://127.0.0.1:$Port. Press Ctrl+C to stop."
& ./.venv/Scripts/python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port $Port
