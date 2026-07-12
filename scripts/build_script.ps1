# build_script.ps1
# Generates the final populate_from_drive.ps1 safely with correct encoding

$scriptContent = @'
param([switch]$OpenExcel)

$templatePath = "C:\Users\User\Downloads\provedores\LIBRO MUESTRA.xlsx"
$outputPath   = "C:\Users\User\Downloads\provedores\CONTROL DE PROVEEDORES Y MATERIAS PRIMAS.xlsx"

# ---- Discover live H: drive roots ----
function Resolve-DriveRoot([string]$id, [string]$keyword) {
    $base = "H:\.shortcut-targets-by-id\$id"
    if (-not (Test-Path $base)) { return $null }
    $found = Get-ChildItem -Path $base -Directory | Where-Object { $_.Name -match $keyword }
    if ($found) { return $found.FullName }
    return $null
}

$mpPath  = Resolve-DriveRoot "1-gHQ9lBrlfH6j6hiD2tvjYc4mBBdFrYA" "MATERIA.PRIMA"
$insPath = Resolve-DriveRoot "1Eu1BPGUg5d6zNWz1rhhFQsMLmnbcGKid" "INSUMOS"
$srvPath = Resolve-DriveRoot "1l4Gb0Lwmb84kjMVXXV4l1vbsFhdlPPSH" "SERVICIOS"

Write-Host "MP  root: $mpPath" -ForegroundColor Cyan
Write-Host "INS root: $insPath" -ForegroundColor Cyan
Write-Host "SRV root: $srvPath" -ForegroundColor Cyan

$roots = @($mpPath, $insPath, $srvPath) | Where-Object { $_ -and (Test-Path $_) }

# ---- Normalise string (remove accents, uppercase) ----
function Normalize([string]$s) {
    $map = @(
        "A","A","A","A","A","A",
        "a","a","a","a","a","a",
        "E","E","E","E","e","e","e","e",
        "I","I","I","I","i","i","i","i",
        "O","O","O","O","O","O","o","o","o","o","o","o",
        "U","U","U","U","u","u","u","u",
        "N","n","C","c"
    )
    $chars = @(
        [char]0xC0,[char]0xC1,[char]0xC2,[char]0xC3,[char]0xC4,[char]0xC5,
        [char]0xE0,[char]0xE1,[char]0xE2,[char]0xE3,[char]0xE4,[char]0xE5,
        [char]0xC8,[char]0xC9,[char]0xCA,[char]0xCB,[char]0xE8,[char]0xE9,[char]0xEA,[char]0xEB,
        [char]0xCC,[char]0xCD,[char]0xCE,[char]0xCF,[char]0xEC,[char]0xED,[char]0xEE,[char]0xEF,
        [char]0xD2,[char]0xD3,[char]0xD4,[char]0xD5,[char]0xD6,[char]0xD8,[char]0xF2,[char]0xF3,[char]0xF4,[char]0xF5,[char]0xF6,[char]0xF8,
        [char]0xD9,[char]0xDA,[char]0xDB,[char]0xDC,[char]0xF9,[char]0xFA,[char]0xFB,[char]0xFC,
        [char]0xD1,[char]0xF1,[char]0xC7,[char]0xE7
    )
    $out = $s.ToUpper()
    for ($i = 0; $i -lt $chars.Count; $i++) {
        $out = $out.Replace([string]$chars[$i], $map[$i])
    }
    # Remove common noise words
    $out = $out -replace 'S\.A\.S?\.?|INC\.?|LTDA\.?|Y CIA\.?|&|DE LA |DE LOS ', ''
    return $out.Trim()
}

# ---- Category detection ----
function Get-DocCat([string]$name) {
    $n = $name.ToLower()
    if ($n -match "ficha.?tecnica|^ft[_ ]|_ft[_ ]|\bft\.pdf|tds\b|technical.?data")         { return "FT" }
    if ($n -match "msds|hoja.?seguridad|sds[_\.]|safety.?data|material.?safety")              { return "MSDS" }
    if ($n -match "alergeno|allergen")                                                          { return "ALERG" }
    if ($n -match "non.?gmo|\bgmo\b")                                                           { return "GMO" }
    if ($n -match "metales.?pesados|heavy.?metal")                                              { return "METALES" }
    if ($n -match "pesticid")                                                                   { return "PESTICID" }
    if ($n -match "micotoxin|mycotox")                                                          { return "MICOTOX" }
    if ($n -match "\bkosher\b")                                                                 { return "KOSHER" }
    if ($n -match "\bhalal\b")                                                                  { return "HALAL" }
    if ($n -match "certificado.*?origen|origen|origin|cert.*?orig")                            { return "ORIGEN" }
    if ($n -match "fssc|iso.?22000|iso22000")                                                   { return "FSSC" }
    if ($n -match "\bbrc\b")                                                                    { return "BRC" }
    if ($n -match "haccp")                                                                      { return "HACCP" }
    if ($n -match "iso.?9001|iso9001")                                                          { return "ISO9001" }
    if ($n -match "acta.?sanitaria|visita.*?prov|prov.*?visita")                               { return "ACTA" }
    if ($n -match "migraci|contact.*?alimento|packaging|empaque.?(analisis|prueba)")           { return "CONTACTO" }
    if ($n -match "fraude|food.?fraud|declaracion.*?fraude")                                   { return "FRAUDE" }
    if ($n -match "\bcoa\b|certif.*calidad|analisis.*calidad")                                  { return "COA" }
    if ($n -match "especificac|specification")                                                  { return "ESPECIF" }
    return "OTRO"
}

# ---- Find supplier folder ----
function Find-SupplierDir([string]$nombre) {
    $n = Normalize $nombre
    if ($n.Length -lt 4) { return $null }
    foreach ($root in $roots) {
        foreach ($dir in (Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue)) {
            $d = Normalize ($dir.Name -replace '^PROVEEDOR |^MAQUILA ', '')
            if ($d.Length -lt 3) { continue }
            if ($n -like "*$d*" -or $d -like "*$n*") { return $dir.FullName }
        }
    }
    return $null
}

# ---- Find material subfolder inside supplier dir ----
function Find-MaterialDir([string]$supplierDir, [string]$material) {
    if (-not $supplierDir) { return $null }
    $mNorm = Normalize $material
    $kw = ($mNorm -split '\s+' | Where-Object { $_.Length -gt 3 }) | Select-Object -First 2
    $dirs = Get-ChildItem -Path $supplierDir -Directory -ErrorAction SilentlyContinue
    foreach ($d in $dirs) {
        $dNorm = Normalize $d.Name
        foreach ($k in $kw) {
            if ($dNorm -like "*$k*") { return $d.FullName }
        }
    }
    return $null
}

# ---- Collect all files for a supplier row ----
function Get-SupplierFiles([string]$supplierDir, [string]$materialDir) {
    $files = @()
    if (-not $supplierDir) { return $files }
    $files += Get-ChildItem -Path $supplierDir -File -ErrorAction SilentlyContinue
    if ($materialDir -and (Test-Path $materialDir)) {
        $files += Get-ChildItem -Path $materialDir -Recurse -File -ErrorAction SilentlyContinue
    }
    foreach ($sub in @('DECLARACIONES','CERTIFICACIONES','CERTIFICADOS','ANALISIS','FICHAS','DOCUMENTOS','DOCUMENTOS LEGALES')) {
        $p = Join-Path $supplierDir $sub
        if (Test-Path $p) { $files += Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue }
    }
    return $files | Select-Object -Property FullName, Name -Unique
}

# ======= MAIN =======
Write-Host ""
Write-Host "Copiando plantilla y abriendo Excel..." -ForegroundColor Yellow
Copy-Item -Path $templatePath -Destination $outputPath -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($outputPath)
$ws = $wb.Sheets.Item("FILLING 2026+")

$rowCount = $ws.UsedRange.Rows.Count
Write-Host "Filas en la plantilla: $rowCount" -ForegroundColor Cyan

$matched = 0; $unmatched = 0

for ($r = 3; $r -le $rowCount; $r++) {
    $material     = $ws.Cells.Item($r, 2).Text
    $fabricante   = $ws.Cells.Item($r, 4).Text
    $distribuidor = $ws.Cells.Item($r, 5).Text

    if ([string]::IsNullOrWhiteSpace($material)) { continue }

    # Try to find the supplier folder
    $supplierDir = $null
    foreach ($name in @($distribuidor, $fabricante)) {
        if ([string]::IsNullOrWhiteSpace($name) -or $name -in @('x','X','N/A','No','No aplica')) { continue }
        $supplierDir = Find-SupplierDir $name
        if ($supplierDir) { break }
    }

    $materialDir = Find-MaterialDir $supplierDir $material
    $allFiles    = Get-SupplierFiles $supplierDir $materialDir

    if ($supplierDir) {
        $matched++
        Write-Host "  [OK ] R$r : $material ($($allFiles.Count) docs)" -ForegroundColor Green
    } else {
        $unmatched++
        Write-Host "  [---] R$r : $material / Fab:$fabricante / Dist:$distribuidor" -ForegroundColor DarkGray
    }

    # ---- Build document inventory ----
    $hasFT       = $false
    $hasMSDS     = $false
    $hasAlerg    = "x"
    $certInoc    = "x"
    $certYear    = "x"
    $actaYear    = "x"
    $fraude      = "x"
    $especif     = "x"
    $contacto    = "No aplica"
    $analisis    = [System.Collections.Generic.List[string]]::new()
    $otras       = [System.Collections.Generic.List[string]]::new()

    foreach ($f in $allFiles) {
        $cat = Get-DocCat $f.Name
        $fn  = $f.Name.ToLower()
        switch ($cat) {
            "FT"       { $hasFT = $true }
            "MSDS"     { $hasMSDS = $true }
            "ALERG"    { $hasAlerg = if ($fn -match "carta") {"En carta"} else {"Si"} }
            "FRAUDE"   { $fraude = "Si" }
            "ESPECIF"  { $especif = "Si" }
            "CONTACTO" { $contacto = "Si" }
            "COA"      { $analisis.Add("COA / Certificado Calidad") }
            "METALES"  {
                $yr = [regex]::Match($f.Name,"20\d{2}")
                $analisis.Add("Metales pesados$(if ($yr.Success) {' '+$yr.Value})")
            }
            "PESTICID" {
                $yr = [regex]::Match($f.Name,"20\d{2}")
                $analisis.Add("Pesticidas$(if ($yr.Success) {' '+$yr.Value})")
            }
            "MICOTOX"  {
                $yr = [regex]::Match($f.Name,"20\d{2}")
                $analisis.Add("Micotoxinas$(if ($yr.Success) {' '+$yr.Value})")
            }
            "FSSC"     {
                $certInoc = "FSSC 22000"
                $yr = [regex]::Match($f.Name,"20\d{2}")
                if ($yr.Success) { $certYear = $yr.Value }
            }
            "BRC"      {
                if ($certInoc -eq "x") { $certInoc = "BRC" }
                $yr = [regex]::Match($f.Name,"20\d{2}")
                if ($yr.Success -and $certYear -eq "x") { $certYear = $yr.Value }
            }
            "HACCP"    { if ($certInoc -eq "x") { $certInoc = "HACCP" } }
            "ISO9001"  {
                if ($certInoc -eq "x") { $certInoc = "ISO 9001" }
                $yr = [regex]::Match($f.Name,"20\d{2}")
                if ($yr.Success -and $certYear -eq "x") { $certYear = $yr.Value }
            }
            "ACTA"     {
                $yr = [regex]::Match($f.Name,"20\d{2}")
                if ($yr.Success) { $actaYear = $yr.Value }
            }
            "ORIGEN"   { $otras.Add("Origen") }
            "KOSHER"   { $otras.Add("Kosher") }
            "HALAL"    { $otras.Add("Halal") }
        }
    }

    if ($especif -eq "x" -and $hasFT) { $especif = "Si" }
    if ($hasMSDS) { $otras.Add("Hoja de Seguridad") }

    # Check if material is packaging/supplies (contacto aplica)
    $mlo = $material.ToLower()
    if ($mlo -notmatch "empaque|tapa|frasco|botella|caja|pallet|etiqueta|termoencoger|capsula|sello") {
        $contacto = "No aplica"
    }

    # ---- Write into Excel ----
    $ws.Cells.Item($r, 7).Value2  = if ($hasFT)   { "Si" } else { "No" }
    $ws.Cells.Item($r, 9).Value2  = $actaYear
    $ws.Cells.Item($r, 11).Value2 = $certInoc
    $ws.Cells.Item($r, 12).Value2 = $certYear
    $ws.Cells.Item($r, 13).Value2 = $hasAlerg
    $ws.Cells.Item($r, 14).Value2 = $contacto
    $ws.Cells.Item($r, 15).Value2 = if ($analisis.Count -gt 0) { ($analisis | Select-Object -Unique) -join [char]10 } else { "x" }
    $ws.Cells.Item($r, 16).Value2 = $fraude
    $ws.Cells.Item($r, 17).Value2 = $especif
    $ws.Cells.Item($r, 18).Value2 = if ($otras.Count -gt 0) { ($otras | Select-Object -Unique) -join [char]10 } else { "x" }
}

$wb.Save()
$wb.Close()
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " RESULTADO FINAL" -ForegroundColor Yellow
Write-Host "  Filas con proveedor encontrado : $matched"   -ForegroundColor Green
Write-Host "  Filas sin coincidencia         : $unmatched" -ForegroundColor DarkYellow
Write-Host "  Archivo guardado en:"
Write-Host "  $outputPath" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Yellow

if ($OpenExcel) {
    Start-Process $outputPath
}
'@

$outPath = "C:\Users\User\Downloads\provedores\scripts\populate_from_drive.ps1"
[System.IO.File]::WriteAllText($outPath, $scriptContent, [System.Text.UTF8Encoding]::new($false))
Write-Output "Script written to: $outPath"
