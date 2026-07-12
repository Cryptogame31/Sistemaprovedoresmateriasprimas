# read_libro_full.ps1 - Reads all rows from LIBRO MUESTRA.xlsx to understand true structure
$path = "C:\Users\User\Downloads\provedores\LIBRO MUESTRA.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($path)
$ws = $wb.Sheets.Item("FILLING 2026+")
$rowCount = $ws.UsedRange.Rows.Count
$colCount = $ws.UsedRange.Columns.Count

Write-Output "HEADERS (row 1):"
$h = @()
for ($c = 1; $c -le $colCount; $c++) { $h += "[$c]:$($ws.Cells.Item(1,$c).Text)" }
Write-Output ($h -join " | ")

Write-Output ""
Write-Output "HEADER 2 (row 2):"
$h2 = @()
for ($c = 1; $c -le $colCount; $c++) { $h2 += "[$c]:$($ws.Cells.Item(2,$c).Text)" }
Write-Output ($h2 -join " | ")

Write-Output ""
Write-Output "ALL DATA ROWS:"
for ($r = 3; $r -le $rowCount; $r++) {
    $col2 = $ws.Cells.Item($r, 2).Text
    $col3 = $ws.Cells.Item($r, 3).Text
    $col4 = $ws.Cells.Item($r, 4).Text
    $col5 = $ws.Cells.Item($r, 5).Text
    $col6 = $ws.Cells.Item($r, 6).Text
    $col7 = $ws.Cells.Item($r, 7).Text
    if ([string]::IsNullOrWhiteSpace($col2)) { continue }
    Write-Output "R$($r): MAT='$col2' | CAT='$col3' | FAB='$col4' | DIST='$col5' | CLI='$col6' | FT='$col7'"
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
