$jsonPath = "C:\Users\User\Downloads\provedores\data.json"
$templatePath = "C:\Users\User\Downloads\provedores\LIBRO MUESTRA.xlsx"
$outputPath = "C:\Users\User\Downloads\provedores\CONTROL DE PROVEEDORES Y MATERIAS PRIMAS.xlsx"

if (-not (Test-Path $jsonPath)) {
    Write-Error "No se encuentra el archivo data.json. Ejecute scan.ps1 primero."
    exit 1
}

Write-Output "Cargando datos de data.json..."
$rawJson = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
$db = ConvertFrom-Json -InputObject $rawJson

Write-Output "Creando copia de la plantilla Excel..."
Copy-Item -Path $templatePath -Destination $outputPath -Force

Write-Output "Abriendo Excel vía COM Object..."
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $excel.Workbooks.Open($outputPath)
$sheet = $workbook.Sheets.Item("FILLING 2026+")

Write-Output "Limpiando filas anteriores a partir de la fila 3..."
$lastRow = $sheet.UsedRange.Rows.Count
if ($lastRow -ge 3) {
    $range = $sheet.Range("A3:R" + $lastRow)
    $range.ClearContents() | Out-Null
}

$row = 3

# Combine all categories from data.json into a single list
$allSuppliers = @()

foreach ($category in $db.data.PSObject.Properties) {
    $catName = $category.Name
    $suppliers = $category.Value
    foreach ($s in $suppliers) {
        $allSuppliers += $s
    }
}

Write-Output "Escribiendo $($allSuppliers.Count) filas en el Excel..."

foreach ($s in $allSuppliers) {
    # 1. Código
    $sheet.Cells.Item($row, 1).Value2 = ($row - 2).ToString()
    
    # 2. Nombre Materia Prima
    $sheet.Cells.Item($row, 2).Value2 = $s.material
    
    # 3. Categoría (adivinar basado en nombre)
    $cat = "Otros"
    $matLower = $s.material.ToLower()
    if ($matLower.Contains("azucar") -or $matLower.Contains("azúcar")) { $cat = "Azúcar" }
    elseif ($matLower.Contains("acido") -or $matLower.Contains("ácido")) { $cat = "Acidulante" }
    elseif ($matLower.Contains("acesulfame") -or $matLower.Contains("aspartame") -or $matLower.Contains("estevia") -or $matLower.Contains("fructosa") -or $matLower.Contains("sucralosa")) { $cat = "Edulcorante" }
    elseif ($matLower.Contains("sabor")) { $cat = "Saborizante" }
    elseif ($matLower.Contains("color")) { $cat = "Colorante" }
    elseif ($matLower.Contains("conservante") -or $matLower.Contains("benzoato") -or $matLower.Contains("sorbato")) { $cat = "Conservante" }
    elseif ($matLower.Contains("goma") -or $matLower.Contains("espesante")) { $cat = "Espesante / Estabilizante" }
    $sheet.Cells.Item($row, 3).Value2 = $cat
    
    # 4. Fabricante
    $sheet.Cells.Item($row, 4).Value2 = $s.provider
    
    # 5. Proveedor / Distribuidor
    $sheet.Cells.Item($row, 5).Value2 = $s.distributor
    
    # 6. Cliente
    # Si viene especificado un cliente en el nombre, o asignamos FILLING Colombia por defecto
    $client = "FILLING Colombia"
    if ($s.folder_name -like "*AJE COLOMBIA*") { $client = "AJE Colombia" }
    elseif ($s.folder_name -like "*JUNIPER*") { $client = "Juniper" }
    elseif ($s.folder_name -like "*DISLICORES*") { $client = "Dislicores" }
    elseif ($s.folder_name -like "*FLA*") { $client = "FLA" }
    elseif ($s.folder_name -like "*ILC*") { $client = "ILC" }
    $sheet.Cells.Item($row, 6).Value2 = $client
    
    # 7. Ficha Técnica
    $sheet.Cells.Item($row, 7).Value2 = if ($s.has_ficha_tecnica) { "Si" } else { "No" }
    
    # 8. Ficha Técnica Interna (dejar vacía o poner "No" por defecto)
    $sheet.Cells.Item($row, 8).Value2 = ""
    
    # 9. Acta Sanitaria / Año de visita
    # Buscar año de acta sanitaria en nombres de archivos
    $actaYear = ""
    foreach ($f in $s.files) {
        if ($f.name.ToLower().Contains("acta") -or $f.name.ToLower().Contains("visita") -or $f.name.ToLower().Contains("sanitaria")) {
            $match = [regex]::Match($f.name, "\d{4}")
            if ($match.Success) {
                $actaYear = $match.Value
                break
            }
        }
    }
    if ($actaYear -eq "") { $actaYear = "x" }
    $sheet.Cells.Item($row, 9).Value2 = $actaYear
    
    # 10. Riesgo HACCP
    $sheet.Cells.Item($row, 10).Value2 = ""
    
    # 11. Certificación e Inocuidad & 12. Fecha Vencimiento
    $certType = "x"
    $certExp = "x"
    foreach ($f in $s.files) {
        if ($f.category -eq "Certificacion de Inocuidad (ISO/FSSC/BRC)") {
            $fn = $f.name.ToLower()
            if ($fn.Contains("fssc 22000") -or $fn.Contains("fssc22000")) { $certType = "FSSC 22000" }
            elseif ($fn.Contains("iso 22000") -or $fn.Contains("iso22000")) { $certType = "ISO 22000" }
            elseif ($fn.Contains("brc")) { $certType = "BRC" }
            elseif ($fn.Contains("haccp")) { $certType = "HACCP" }
            elseif ($fn.Contains("iso 9001") -or $fn.Contains("iso9001")) { $certType = "ISO 9001" }
            
            $match = [regex]::Match($f.name, "\d{4}")
            if ($match.Success) {
                $certExp = $match.Value
            }
            break
        }
    }
    $sheet.Cells.Item($row, 11).Value2 = $certType
    $sheet.Cells.Item($row, 12).Value2 = $certExp
    
    # 13. Declaración Alérgenos
    $alergenos = "No"
    foreach ($f in $s.files) {
        if ($f.category -eq "Declaracion de Alergenos") {
            if ($f.name.ToLower().Contains("carta")) {
                $alergenos = "En carta"
            } else {
                $alergenos = "Si"
            }
            break
        }
    }
    $sheet.Cells.Item($row, 13).Value2 = $alergenos
    
    # 14. Contacto Alimentos (Envases y tapas)
    $contacto = "No aplica"
    $folderLower = $s.folder_name.ToLower()
    if ($folderLower.Contains("empaque") -or $folderLower.Contains("tapa") -or $folderLower.Contains("insumos") -or $s.folder_type -eq "Proveedores Insumos") {
        $contacto = "No"
        foreach ($f in $s.files) {
            if ($f.category -eq "Migracion/Contacto Alimentos") {
                $contacto = "Si"
                break
            }
        }
    }
    $sheet.Cells.Item($row, 14).Value2 = $contacto
    
    # 15. Análisis FQ (Metales pesados, pesticidas, toxinas, COA)
    $analisisList = @()
    foreach ($f in $s.files) {
        if ($f.category -eq "Metales Pesados") {
            $year = ""
            $match = [regex]::Match($f.name, "\d{4}")
            if ($match.Success) { $year = " " + $match.Value }
            $analisisList += ("Metales pesados" + $year)
        }
        if ($f.category -eq "Declaracion de Pesticidas") {
            $year = ""
            $match = [regex]::Match($f.name, "\d{4}")
            if ($match.Success) { $year = " " + $match.Value }
            $analisisList += ("Pesticidas" + $year)
        }
        if ($f.category -eq "Declaracion de Micotoxinas") {
            $year = ""
            $match = [regex]::Match($f.name, "\d{4}")
            if ($match.Success) { $year = " " + $match.Value }
            $analisisList += ("Micotoxinas" + $year)
        }
        if ($f.category -eq "Certificado de Analisis (COA)") {
            $analisisList += "COA / Certificado de Calidad"
        }
    }
    $analisisText = "x"
    if ($analisisList.Count -gt 0) {
        $analisisText = ($analisisList | Select-Object -Unique) -join "`n"
    }
    $sheet.Cells.Item($row, 15).Value2 = $analisisText
    
    # 16. Cartas Firmadas / Fraude
    $fraude = "No"
    foreach ($f in $s.files) {
        if ($f.name.ToLower().Contains("fraude") -or $f.name.ToLower().Contains("fraud")) {
            $fraude = "Si"
            break
        }
    }
    $sheet.Cells.Item($row, 16).Value2 = $fraude
    
    # 17. Especificación
    # Especificación técnica a menudo coincide con la ficha técnica o especificaciones particulares
    $especif = "No"
    foreach ($f in $s.files) {
        if ($f.name.ToLower().Contains("especificaci") -or $f.name.ToLower().Contains("spec")) {
            $especif = "Si"
            break
        }
    }
    if ($especif -eq "No" -and $s.has_ficha_tecnica) {
        $especif = "Si" # A menudo Ficha Técnica actúa como Especificación
    }
    $sheet.Cells.Item($row, 17).Value2 = $especif
    
    # 18. Otras
    $otrasList = @()
    if ($s.has_msds) { $otrasList += "Hoja de Seguridad" }
    foreach ($f in $s.files) {
        if ($f.category -eq "Certificado de Origen") { $otrasList += "Origen" }
        if ($f.category -eq "Certificacion Kosher") { $otrasList += "Certificación Kosher" }
        if ($f.category -eq "Certificacion Halal") { $otrasList += "Certificación Halal" }
    }
    $otrasText = "x"
    if ($otrasList.Count -gt 0) {
        $otrasText = ($otrasList | Select-Object -Unique) -join "`n"
    }
    $sheet.Cells.Item($row, 18).Value2 = $otrasText
    
    $row++
}

Write-Output "Guardando cambios y cerrando Excel..."
$workbook.Save()
$workbook.Close()
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Output "Llenado completado exitosamente!"
Write-Output "Archivo guardado en: $outputPath"
