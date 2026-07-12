$excelPath = "C:\Users\User\Downloads\provedores\LIBRO MUESTRA.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$workbook = $excel.Workbooks.Open($excelPath)

Write-Output "Hojas en el libro:"
foreach ($sheet in $workbook.Sheets) {
    Write-Output " - $($sheet.Name)"
}

$sheet = $workbook.ActiveSheet
Write-Output "Hoja activa: $($sheet.Name)"

$rowCount = $sheet.UsedRange.Rows.Count
$colCount = $sheet.UsedRange.Columns.Count
Write-Output "Dimensiones de la hoja usada: RowCount=$rowCount, ColCount=$colCount"

Write-Output "Primeras 10 filas:"
for ($row = 1; $row -le [Math]::Min(10, $rowCount); $row++) {
    $rowValues = @()
    for ($col = 1; $col -le $colCount; $col++) {
        $val = $sheet.Cells.Item($row, $col).Text
        $rowValues += "'$val'"
    }
    Write-Output "Fila $($row): $($rowValues -join ', ')"
}

$workbook.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
