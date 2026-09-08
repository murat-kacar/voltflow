$targetDir = "$env:LOCALAPPDATA\ms-playwright-go\1.57.0"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$tarball = "$env:TEMP\playwright-core-1.57.0.tgz"
Write-Host "Extracting $tarball to $targetDir..."
tar.exe -xzf $tarball -C $targetDir

Write-Host "Copying node.exe to $targetDir..."
$nodeCmd = Get-Command node.exe
Copy-Item $nodeCmd.Source "$targetDir\node.exe" -Force

Write-Host "Creating driver entry points..."
$cmdContent = "@echo off`r`n`"%~dp0\node.exe`" `"%~dp0\package\cli.js`" %*"
[System.IO.File]::WriteAllText("$targetDir\playwright.cmd", $cmdContent)

$psContent = '& "$PSScriptRoot\node.exe" "$PSScriptRoot\package\cli.js" $args'
[System.IO.File]::WriteAllText("$targetDir\playwright.ps1", $psContent)

Write-Host "Testing driver..."
& "$targetDir\node.exe" "$targetDir\package\cli.js" --version
Write-Host "Playwright driver 1.57.0 successfully configured!"
