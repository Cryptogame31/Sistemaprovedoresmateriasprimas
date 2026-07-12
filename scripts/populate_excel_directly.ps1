$templatePath = "C:\Users\User\Downloads\provedores\LIBRO MUESTRA.xlsx"
$outputPath = "C:\Users\User\Downloads\provedores\CONTROL DE PROVEEDORES Y MATERIAS PRIMAS.xlsx"

$hRoots = @(
    "H:\.shortcut-targets-by-id\1-gHQ9lBrlfH6j6hiD2tvjYc4mBBdFrYA\INFORMACIÓN PROVEEDORES MATERIA PRIMA",
    "H:\.shortcut-targets-by-id\1Eu1BPGUg5d6zNWz1rhhFQsMLmnbcGKid\INFORMACIÓN PROVEEDORES INSUMOS-MATERIAL DE EMPAQUE",
    "H:\.shortcut-targets-by-id\1l4Gb0Lwmb84kjMVXXV4l1vbsFhdlPPSH\INFORMACIÓN PROVEEDORES DE SERVICIOS"
)

function Get-DocumentCategory ($filename) {
    $fn = $filename.ToLower()
    if ($fn.Contains("ficha tecnica") -or $fn.Contains("ft ") -or $fn.Contains("ft_") -or $fn.Contains("tds") -or $fn.Contains("technical data")) { return "Ficha Tecnica" }
    if ($fn.Contains("seguridad") -or $fn.Contains("msds") -or $fn.Contains("sds") -or $fn.Contains("hs_") -or $fn.Contains("safety data")) { return "Hoja de Seguridad (MSDS)" }
    if ($fn.Contains("alergeno") -or $fn.Contains("allergen")) { return "Declaracion de Alergenos" }
    if ($fn.Contains("gmo") -or $fn.Contains("non-gmo") -or $fn.Contains("non gmo")) { return "Certificacion GMO" }
    if ($fn.Contains("metales") -or $fn.Contains("pesados") -or $fn.Contains("heavy") -or $fn.Contains("metal")) { return "Metales Pesados" }
    if ($fn.Contains("kosher")) { return "Certificacion Kosher" }
    if ($fn.Contains("halal")) { return "Certificacion Halal" }
    if ($fn.Contains("origen") -or $fn.Contains("origin")) { return "Certificado de Origen" }
    if ($fn.Contains("iso") -or $fn.Contains("brc") -or $fn.Contains("fssc") -or $fn.Contains("haccp")) { return "Certificacion de Inocuidad (ISO/FSSC/BRC)" }
    if ($fn.Contains("pesticid")) { return "Declaracion de Pesticidas" }
    if ($fn.Contains("micotox")) { return "Declaracion de Micotoxinas" }
    if ($fn.Contains("empaque") -or $fn.Contains("migracion") -or $fn.Contains("package") -or $fn.Contains("packaging")) { return "Migracion/Contacto Alimentos" }
    if ($fn.Contains("certificado de calidad") -or $fn.Contains("coa") -or $fn.Contains("coad") -or $fn.Contains("analisis") -or $fn.Contains("analis")) { return "Certificado de Analisis (COA)" }
    
    $ext = [System.IO.Path]::GetExtension($fn)
    if ($ext -eq ".pdf" -or $ext -eq ".docx" -or $ext -eq ".doc") { return "Otros Documentos" }
    return "Archivos de Registro / Otros"
}

function Find-SupplierFolder ($distributor, $fabricante) {
    $names = @($distributor, $fabricante)
    foreach ($n in $names) {
        if ([string]::IsNullOrEmpty($n) -or $n.Trim().ToLower() -eq "x" -or $n.Trim().ToLower() -eq "no" -or $n.Trim().ToLower() -eq "n/a") { continue }
        
        # Clean name
        $norm = $n.ToUpper().Replace("S.A.", "").Replace("S.A.S.", "").Replace("S.A", "").Replace("INC.", "").Trim()
        if ($norm.Length -lt 3) { continue }
        
        foreach ($root in $hRoots) {
            if (Test-Path $root) {
                $folders = Get-ChildItem -Path $root -Directory
                foreach ($f in $folders) {
                    $fnNorm = $f.Name.ToUpper()
                    $fnClean = $fnNorm.Replace("PROVEEDOR ", "").Replace("MAQUILA ", "").Trim()
                    
                    if ($fnClean.Contains($norm) -or $norm.Contains($fnClean)) {
                        return $f.FullName
                    }
                }
            }
        }
    }
    return $null
}

function Find-MaterialFolder ($supplierPath, $materialName) {
    if (-not $supplierPath) { return $null }
    
    # Normalize material name: e.g. "Acesulfame de potasio" -> "ACESULFAME"
    $cleanMat = $materialName.Replace("Á", "A").Replace("É", "E").Replace("Í", "I").Replace("Ó", "O").Replace("Ú", "U")
    $parts = $cleanMat.ToUpper().Split(" ")
    $normMat = $parts[0]
    if ($normMat -eq "AZUCAR" -or $normMat -eq "AZÚCAR") { $normMat = "AZU" } # match Azúcar refinado / Azúcar grano fino
    if ($normMat -eq "ACIDO" -or $normMat -eq "ÁCIDO") {
        if ($parts.Length -gt 1) { $normMat = $parts[0] + " " + $parts[1] } # e.g. ACIDO CITRICO
    }
    
    $subfolders = Get-ChildItem -Path $supplierPath -Directory
    foreach ($sub in $subfolders) {
        $subNorm = $sub.Name.ToUpper()
        if ($subNorm.Contains($normMat) -or $normMat.Contains($subNorm)) {
            return $sub.FullName
        }
    }
    return $null
}

Write-Output "Iniciando llenado directo desde H: drive..."
Copy-Item -Path $templatePath -Destination $outputPath -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $excel.Workbooks.Open($outputPath)
$sheet = $workbook.Sheets.Item("FILLING 2026+")

$rowCount = $sheet.UsedRange.Rows.Count
Write-Output "Total de filas detectadas en la plantilla: $rowCount"

for ($row = 3; $row -le $rowCount; $row++) {
    $materiaPrima = $sheet.Cells.Item($row, 2).Text
    $fabricante = $sheet.Cells.Item($row, 4).Text
    $distribuidor = $sheet.Cells.Item($row, 5).Text
    
    if ([string]::IsNullOrEmpty($materiaPrima)) { continue }
    
    Write-Output "Fila $($row): Procesando '$materiaPrima' ($fabricante / $distribuidor)..."
    
    # Find folders
    $supplierFolder = Find-SupplierFolder $distribuidor $fabricante
    $materialFolder = Find-MaterialFolder $supplierFolder $materiaPrima
    
    $allFiles = @()
    if ($supplierFolder) {
        # Check files inside material subfolder
        if ($materialFolder -and (Test-Path $materialFolder)) {
            $allFiles += Get-ChildItem -Path $materialFolder -File -Recurse
        }
        
        # Also check files directly in supplier root folder and standard folders like DECLARACIONES
        $allFiles += Get-ChildItem -Path $supplierFolder -File
        $declPath = Join-Path $supplierFolder "DECLARACIONES"
        if (Test-Path $declPath) { $allFiles += Get-ChildItem -Path $declPath -File -Recurse }
        $migrPath = Join-Path $supplierFolder "MIGRACIÓN EMPAQUE"
        if (Test-Path $migrPath) { $allFiles += Get-ChildItem -Path $migrPath -File -Recurse }
    }
    
    # Evaluate files
    $hasFt = $false
    $hasMsds = $false
    $hasCoa = $false
    $hasAlergenos = "No"
    $hasContacto = "No aplica"
    $hasFraude = "No"
    $hasEspecif = "No"
    $certType = "x"
    $certExp = "x"
    $actaYear = "x"
    $analisisList = @()
    $otrasList = @()
    
    if ($allFiles.Count -gt 0) {
        # De-duplicate files by full path
        $uniqueFiles = $allFiles | Select-Object -Unique
        
        foreach ($file in $uniqueFiles) {
            $cat = Get-DocumentCategory $file.Name
            $fn = $file.Name.ToLower()
            
            if ($cat -eq "Ficha Tecnica") { $hasFt = $true }
            if ($cat -eq "Hoja de Seguridad (MSDS)") { $hasMsds = $true }
            if ($cat -eq "Certificado de Analisis (COA)") { $hasCoa = $true; $analisisList += "COA / Certificado de Calidad" }
            
            if ($cat -eq "Declaracion de Alergenos") {
                $hasAlergenos = if ($fn.Contains("carta")) { "En carta" } else { "Si" }
            }
            
            if ($cat -eq "Migracion/Contacto Alimentos") { $hasContacto = "Si" }
            
            if ($fn.Contains("fraude") -or $fn.Contains("fraud")) { $hasFraude = "Si" }
            if ($fn.Contains("especificaci") -or $fn.Contains("spec")) { $hasEspecif = "Si" }
            
            if ($cat -eq "Certificacion de Inocuidad (ISO/FSSC/BRC)") {
                if ($fn.Contains("fssc 22000")) { $certType = "FSSC 22000" }
                elseif ($fn.Contains("iso 22000")) { $certType = "ISO 22000" }
                elseif ($fn.Contains("brc")) { $certType = "BRC" }
                elseif ($fn.Contains("haccp")) { $certType = "HACCP" }
                elseif ($fn.Contains("iso 9001")) { $certType = "ISO 9001" }
                
                $match = [regex]::Match($file.Name, "\d{4}")
                if ($match.Success) { $certExp = $match.Value }
            }
            
            if ($fn.Contains("acta") -or $fn.Contains("visita") -or $fn.Contains("sanitaria")) {
                $match = [regex]::Match($file.Name, "\d{4}")
                if ($match.Success) { $actaYear = $match.Value }
            }
            
            if ($cat -eq "Metales Pesados") {
                $year = ""
                $match = [regex]::Match($file.Name, "\d{4}")
                if ($match.Success) { $year = " " + $match.Value }
                $analisisList += ("Metales pesados" + $year)
            }
            if ($cat -eq "Declaracion de Pesticidas") {
                $year = ""
                $match = [regex]::Match($file.Name, "\d{4}")
                if ($match.Success) { $year = " " + $match.Value }
                $analisisList += ("Pesticidas" + $year)
            }
            if ($cat -eq "Declaracion de Micotoxinas") {
                $year = ""
                $match = [regex]::Match($file.Name, "\d{4}")
                if ($match.Success) { $year = " " + $match.Value }
                $analisisList += ("Micotoxinas" + $year)
            }
            
            if ($cat -eq "Certificado de Origen") { $otrasList += "Origen" }
            if ($cat -eq "Certificacion Kosher") { $otrasList += "Certificación Kosher" }
            if ($cat -eq "Certificacion Halal") { $otrasList += "Certificación Halal" }
        }
    }
    
    # Write values back into active cells
    $sheet.Cells.Item($row, 7).Value2 = if ($hasFt) { "Si" } else { "No" }
    $sheet.Cells.Item($row, 9).Value2 = $actaYear
    $sheet.Cells.Item($row, 11).Value2 = $certType
    $sheet.Cells.Item($row, 12).Value2 = $certExp
    $sheet.Cells.Item($row, 13).Value2 = $hasAlergenos
    
    # Envase contact
    $mLower = $materiaPrima.ToLower()
    if ($mLower.Contains("empaque") -or $mLower.Contains("tapa") -or $mLower.Contains("frasco") -or $mLower.Contains("caja") -or $mLower.Contains("insumo")) {
        $sheet.Cells.Item($row, 14).Value2 = $hasContacto
    } else {
        $sheet.Cells.Item($row, 14).Value2 = "No aplica"
    }
    
    # FQ List
    $fqText = "x"
    if ($analisisList.Count -gt 0) {
        $fqText = ($analisisList | Select-Object -Unique) -join "`n"
    }
    $sheet.Cells.Item($row, 15).Value2 = $fqText
    
    # Fraud
    $sheet.Cells.Item($row, 16).Value2 = $hasFraude
    
    # Spec
    if ($hasEspecif -eq "No" -and $hasFt) { $hasEspecif = "Si" }
    $sheet.Cells.Item($row, 17).Value2 = $hasEspecif
    
    # Otras
    if ($hasMsds) { $otrasList += "Hoja de Seguridad" }
    $otrasText = "x"
    if ($otrasList.Count -gt 0) {
        $otrasText = ($otrasList | Select-Object -Unique) -join "`n"
    }
    $sheet.Cells.Item($row, 18).Value2 = $otrasText
}

Write-Output "Guardando cambios y cerrando Excel..."
$workbook.Save()
$workbook.Close()
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Output "Llenado completado de forma precisa desde Google Drive (H: drive)!"
