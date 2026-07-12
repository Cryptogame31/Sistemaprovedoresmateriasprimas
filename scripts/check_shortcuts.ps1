$wsh = New-Object -ComObject WScript.Shell
$lnkFiles = Get-ChildItem -Path "G:\Mi unidad\PROCESOS SIG" -Filter *.lnk -Recurse
foreach ($file in $lnkFiles) {
    $target = $wsh.CreateShortcut($file.FullName).TargetPath
    Write-Output $file.Name
    Write-Output $target
}
