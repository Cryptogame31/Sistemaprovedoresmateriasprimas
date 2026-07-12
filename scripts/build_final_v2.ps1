# build_final_v2.ps1
# Fixes the PowerShell syntax error 'return if (...) { ... }'

$script = @'
param([switch]$AbrirExcel)

$templatePath = "C:\Users\User\Downloads\provedores\LIBRO MUESTRA.xlsx"
$outputPath   = "C:\Users\User\Downloads\provedores\CONTROL DE PROVEEDORES Y MATERIAS PRIMAS.xlsx"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "  SISTEMA GESTION PROVEEDORES Y MATERIAS PRIMAS - FILLING CO." -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow

# Detect H: drive roots
function Get-DriveRoot([string]$id, [string]$namePattern) {
    $base = "H:\.shortcut-targets-by-id\$id"
    if (-not (Test-Path $base)) { return $null }
    $d = Get-ChildItem -Path $base -Directory | Where-Object { $_.Name -match $namePattern } | Select-Object -First 1
    if ($d) { return $d.FullName } else { return $null }
}

$mpRoot  = Get-DriveRoot "1-gHQ9lBrlfH6j6hiD2tvjYc4mBBdFrYA" "MATERIA"
$insRoot = Get-DriveRoot "1Eu1BPGUg5d6zNWz1rhhFQsMLmnbcGKid" "INSUMOS"
$srvRoot = Get-DriveRoot "1l4Gb0Lwmb84kjMVXXV4l1vbsFhdlPPSH" "SERVICIOS"

# Also include backup copy paths
$backupMp  = "C:\Users\User\Downloads\provedores_backup\GC-MP-PG11 MATERIAS PRIMAS E INSUMOS\MATERIAS PRIMAS_ PROVEEDORES 2026"
$backupMp2 = "C:\Users\User\Downloads\provedores_backup\GC-MP-PG11 MATERIAS PRIMAS E INSUMOS\MATERIA PRIMA"
$backupIns = "C:\Users\User\Downloads\provedores_backup\GC-MP-PG11 MATERIAS PRIMAS E INSUMOS\INSUMOS"

Write-Host "Fuentes de datos:" -ForegroundColor Cyan
foreach ($src in @($mpRoot, $insRoot, $srvRoot, $backupMp, $backupMp2, $backupIns)) {
    if ($src -and (Test-Path $src)) { Write-Host "  [OK] $src" -ForegroundColor Green }
    else { Write-Host "  [--] $src" -ForegroundColor DarkGray }
}

$allRoots = @($mpRoot, $insRoot, $srvRoot, $backupMp, $backupMp2, $backupIns) | Where-Object { $_ -and (Test-Path $_) }

# ---- Strip accents (unicode char-by-char) ----
function Strip-Accents([string]$s) {
    $src = [char[]]"$([char]0xC0)$([char]0xC1)$([char]0xC2)$([char]0xC3)$([char]0xC4)$([char]0xC5)$([char]0xE0)$([char]0xE1)$([char]0xE2)$([char]0xE3)$([char]0xE4)$([char]0xE5)$([char]0xC8)$([char]0xC9)$([char]0xCA)$([char]0xCB)$([char]0xE8)$([char]0xE9)$([char]0xEA)$([char]0xEB)$([char]0xCC)$([char]0xCD)$([char]0xCE)$([char]0xCF)$([char]0xEC)$([char]0xED)$([char]0xEE)$([char]0xEF)$([char]0xD2)$([char]0xD3)$([char]0xD4)$([char]0xD5)$([char]0xD6)$([char]0xD8)$([char]0xF2)$([char]0xF3)$([char]0xF4)$([char]0xF5)$([char]0xF6)$([char]0xF8)$([char]0xD9)$([char]0xDA)$([char]0xDB)$([char]0xDC)$([char]0xF9)$([char]0xFA)$([char]0xFB)$([char]0xFC)$([char]0xD1)$([char]0xF1)"
    $rep =  "AAAAAAaaaaaaEEEEeeeeIIIIiiiIOOOOOOooooooUUUUuuuuNn"
    $out = $s.ToUpper()
    for ($i = 0; $i -lt $src.Length; $i++) {
        $out = $out.Replace([string]$src[$i], [string]$rep[$i])
    }
    return $out.Trim()
}

# ---- Find best matching provider folder across all roots ----
function Find-ProviderFolder([string]$distribuidor, [string]$fabricante) {
    $candidates = @($distribuidor, $fabricante) | Where-Object { 
        $_ -and $_.Trim() -ne "" -and $_ -notin @("x","X","N/A","No","No aplica","Si")
    }
    
    foreach ($candidate in $candidates) {
        # Split by "/" to handle multi-distributor entries like "Belchem/Escentiall"
        $names = $candidate -split "[/,]"
        foreach ($rawName in $names) {
            $normName = Strip-Accents $rawName.Trim()
            # Remove common noise: S.A.S, LTDA, de C.V., etc.
            $normName = $normName -replace '\s*(S\.A\.S?\.?|LTDA\.?|INC\.?|DE C\.V\.?|Y CIA\.?)', ''
            $normName = $normName.Trim()
            if ($normName.Length -lt 4) { continue }
            
            foreach ($root in $allRoots) {
                $dirs = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue
                foreach ($dir in $dirs) {
                    # Remove "PROVEEDOR " prefix for comparison
                    $dirClean = Strip-Accents ($dir.Name -replace '^PROVEEDOR\s+|^MAQUILA\s+', '')
                    $dirClean = $dirClean -replace '\s*(S\.A\.S?\.?|LTDA\.?|INC\.?|DE C\.V\.?|Y CIA\.?)', ''
                    $dirClean = $dirClean.Trim()
                    if ($dirClean.Length -lt 3) { continue }
                    
                    # Bidirectional partial match
                    if ($dirClean -like "*$normName*" -or $normName -like "*$dirClean*") {
                        return $dir.FullName
                    }
                }
            }
        }
    }
    return $null
}

# ---- Find material subfolder inside provider folder ----
function Find-MaterialFolder([string]$providerDir, [string]$material) {
    if (-not $providerDir -or -not (Test-Path $providerDir)) { return $null }
    $normMat = Strip-Accents $material
    # Build keyword list from material name (each word > 3 chars)
    $keywords = ($normMat -split "[\s\-]+") | Where-Object { $_.Length -gt 3 }
    
    $dirs = Get-ChildItem -Path $providerDir -Directory -ErrorAction SilentlyContinue
    # Score each subfolder
    $best = $null; $bestScore = 0
    foreach ($dir in $dirs) {
        $dirNorm = Strip-Accents $dir.Name
        $score = 0
        foreach ($kw in $keywords) { if ($dirNorm -like "*$kw*") { $score++ } }
        if ($score -gt $bestScore) { $bestScore = $score; $best = $dir.FullName }
    }
    if ($bestScore -gt 0) { return $best }
    return $null
}

# ---- Gather all files for a supplier + optional material folder ----
function Get-AllFiles([string]$providerDir, [string]$materialFolder) {
    $files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
    if (-not $providerDir) { return $files }
    
    # Files directly in provider root
    Get-ChildItem -Path $providerDir -File -ErrorAction SilentlyContinue | ForEach-Object { $files.Add($_) }
    
    # Files in material subfolder (recursive)
    if ($materialFolder -and (Test-Path $materialFolder)) {
        Get-ChildItem -Path $materialFolder -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $files.Add($_) }
    }
    
    # Also scan shared folders like DECLARACIONES, CERTIFICACIONES, ANALISIS
    foreach ($sub in @("DECLARACIONES","CERTIFICACIONES","CERTIFICADOS","ANALISIS","FICHAS TECNICAS","DOCUMENTOS")) {
        $p = Join-Path $providerDir $sub
        if (Test-Path $p) {
            Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object { $files.Add($_) }
        }
    }
    return $files
}

# ---- Categorize document by file name ----
function Get-DocCat([string]$name) {
    $n = $name.ToLower()
    if ($n -match "(^ft[_\s]|[_\s]ft[_\s]|^ft\.)|ficha.?tecnica|tds\b|technical.?data.?sheet") { return "FT" }
    if ($n -match "msds|hoja.?de.?seguridad|safety.?data|material.?safety|^hs[_\.]|[_\.]hs\.") { return "MSDS" }
    if ($n -match "alergeno|allergen|alergen") { return "ALERG" }
    if ($n -match "non.?gmo|gmo|geneticamente") { return "GMO" }
    if ($n -match "metal(es)?.?(pesado|heavy)|heavy.?metal") { return "METALES" }
    if ($n -match "pesticid") { return "PESTICID" }
    if ($n -match "micotoxin|mycotox|toxina") { return "MICOTOX" }
    if ($n -match "kosher") { return "KOSHER" }
    if ($n -match "halal") { return "HALAL" }
    if ($n -match "cert.*?origen|origen|origin|certificado.*?origen") { return "ORIGEN" }
    if ($n -match "fssc|iso.?22000|iso22000") { return "FSSC" }
    if ($n -match "\bbrc\b") { return "BRC" }
    if ($n -match "haccp") { return "HACCP" }
    if ($n -match "iso.?9001|iso9001") { return "ISO9001" }
    if ($n -match "acta.?sanitaria|visita.*?prov|prov.*?visita|acta.*?visita") { return "ACTA" }
    if ($n -match "migraci|contact.*?alimento|migration.*?packag|test.*?empaque") { return "CONTACTO" }
    if ($n -match "fraude|food.?fraud") { return "FRAUDE" }
    if ($n -match "\bcoa\b|certif.*?calidad|certif.*?analisis|certificate.?of.?analys") { return "COA" }
    if ($n -match "especificac|specification\b") { return "ESPECIF" }
    return "OTRO"
}

# ======================== MAIN ========================
Write-Host ""
Write-Host "Copiando plantilla..." -ForegroundColor Yellow
Copy-Item -Path $templatePath -Destination $outputPath -Force

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($outputPath)
$ws = $wb.Sheets.Item("FILLING 2026+")
$rowCount = $ws.UsedRange.Rows.Count
Write-Host "Filas en plantilla: $rowCount" -ForegroundColor Cyan
Write-Host ""

$matched = 0; $unmatched = 0

for ($r = 3; $r -le $rowCount; $r++) {
    $material     = $ws.Cells.Item($r, 2).Text.Trim()
    $fabricante   = $ws.Cells.Item($r, 4).Text.Trim()
    $distribuidor = $ws.Cells.Item($r, 5).Text.Trim()
    if ([string]::IsNullOrWhiteSpace($material)) { continue }

    # Find provider folder (distribuidor first, then fabricante)
    $provFolder = Find-ProviderFolder $distribuidor $fabricante
    $matFolder  = Find-MaterialFolder $provFolder $material
    $allFiles   = Get-AllFiles $provFolder $matFolder

    if ($provFolder) {
        $matched++
        $src = if ($matFolder) { " [subcarpeta: $(Split-Path $matFolder -Leaf)]" } else { "" }
        Write-Host "  [OK ] R$r : $material | $distribuidor$src | $($allFiles.Count) docs" -ForegroundColor Green
    } else {
        $unmatched++
        Write-Host "  [--- ] R$r : $material | Dist:'$distribuidor' Fab:'$fabricante'" -ForegroundColor DarkGray
    }

    # --- Evaluate documents ---
    $hasFT   = $false; $hasMSDS = $false; $hasCOA = $false
    $alerg   = "x"; $certInoc = "x"; $certYear = "x"; $actaYear = "x"
    $fraude  = "x"; $especif = "x"; $contacto = "No aplica"
    $analisis = [System.Collections.Generic.List[string]]::new()
    $otras    = [System.Collections.Generic.List[string]]::new()

    foreach ($f in $allFiles) {
        $cat = Get-DocCat $f.Name
        $fn  = $f.Name.ToLower()
        $yr  = $null; $yrM = [regex]::Match($f.Name, "20\d{2}"); if ($yrM.Success) { $yr = $yrM.Value }

        switch ($cat) {
            "FT"       { $hasFT = $true }
            "MSDS"     { $hasMSDS = $true }
            "COA"      { $hasCOA = $true }
            "ALERG"    { $alerg  = if ($fn -match "carta") {"En carta"} else {"Si"} }
            "FRAUDE"   { $fraude = "Si" }
            "ESPECIF"  { $especif = "Si" }
            "CONTACTO" { $contacto = "Si" }
            "ORIGEN"   { $otras.Add("Origen") }
            "KOSHER"   { $otras.Add("Kosher") }
            "HALAL"    { $otras.Add("Halal") }
            "METALES"  { $analisis.Add("Metales pesados$(if ($yr) {' '+$yr})") }
            "PESTICID" { $analisis.Add("Pesticidas$(if ($yr) {' '+$yr})") }
            "MICOTOX"  { $analisis.Add("Micotoxinas$(if ($yr) {' '+$yr})") }
            "FSSC"     { $certInoc = "FSSC 22000"; if ($yr -and $certYear -eq "x") { $certYear = $yr } }
            "BRC"      { if ($certInoc -eq "x") { $certInoc = "BRC" }; if ($yr -and $certYear -eq "x") { $certYear = $yr } }
            "HACCP"    { if ($certInoc -eq "x") { $certInoc = "HACCP" } }
            "ISO9001"  { if ($certInoc -eq "x") { $certInoc = "ISO 9001" }; if ($yr -and $certYear -eq "x") { $certYear = $yr } }
            "ACTA"     { if ($yr) { $actaYear = $yr } }
        }
    }

    if ($hasCOA)  { $analisis.Add("COA / Certificado de Calidad") }
    if ($hasMSDS) { $otras.Add("Hoja de Seguridad") }
    if ($especif -eq "x" -and $hasFT) { $especif = "Si" }

    # Contacto alimentos only for packaging
    $mlo = $material.ToLower()
    if ($mlo -notmatch "empaque|tapa|frasco|botella|caja|pallet|palet|etiqueta|termoencoger|capsula|sello|envase|tarro") {
        $contacto = "No aplica"
    }

    # --- Write to Excel ---
    $ws.Cells.Item($r, 7).Value2  = if ($hasFT)   { "Si" } else { "No" }
    $ws.Cells.Item($r, 9).Value2  = $actaYear
    $ws.Cells.Item($r, 11).Value2 = $certInoc
    $ws.Cells.Item($r, 12).Value2 = $certYear
    $ws.Cells.Item($r, 13).Value2 = $alerg
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
Write-Host " Filas procesadas con coincidencia : $matched"    -ForegroundColor Green
Write-Host " Filas sin coincidencia (revisar)  : $unmatched"  -ForegroundColor DarkYellow
Write-Host " Archivo: $outputPath" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

if ($AbrirExcel) { Start-Process $outputPath }
'@

$destPath = "C:\Users\User\Downloads\provedores\scripts\populate_from_drive.ps1"
[System.IO.File]::WriteAllText($destPath, $script, [System.Text.UTF8Encoding]::new($false))
Write-Output "Script generado con sintaxis corregida: $destPath"
