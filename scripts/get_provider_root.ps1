# get_provider_root.ps1 - Find actual paths for provider drives
$root1 = "H:\.shortcut-targets-by-id\1-gHQ9lBrlfH6j6hiD2tvjYc4mBBdFrYA"
$root2 = "H:\.shortcut-targets-by-id\1Eu1BPGUg5d6zNWz1rhhFQsMLmnbcGKid"
$root3 = "H:\.shortcut-targets-by-id\1l4Gb0Lwmb84kjMVXXV4l1vbsFhdlPPSH"

$dirs1 = Get-ChildItem -Path $root1 -Directory
foreach ($d in $dirs1) {
    Write-Output "MP ROOT: $($d.FullName)"
    $sub = Get-ChildItem -Path $d.FullName -Directory | Select-Object -First 5
    foreach ($s in $sub) {
        Write-Output "   $($s.Name)"
    }
}
Write-Output "---"
$dirs2 = Get-ChildItem -Path $root2 -Directory
foreach ($d in $dirs2) {
    Write-Output "INSUMOS ROOT: $($d.FullName)"
    $sub = Get-ChildItem -Path $d.FullName -Directory | Select-Object -First 5
    foreach ($s in $sub) {
        Write-Output "   $($s.Name)"
    }
}
Write-Output "---"
if (Test-Path $root3) {
    $dirs3 = Get-ChildItem -Path $root3 -Directory
    foreach ($d in $dirs3) {
        Write-Output "SERVICIOS ROOT: $($d.FullName)"
    }
}
