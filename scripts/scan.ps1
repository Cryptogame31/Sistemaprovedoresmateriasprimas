$backupRoot = "C:\Users\User\Downloads\provedores_backup"
$basePath = "$backupRoot\GC-MP-PG11 MATERIAS PRIMAS E INSUMOS"
$outputPath = "C:\Users\User\Downloads\provedores\data.json"

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

function Parse-FolderName ($folderName) {
    $parts = $folderName.Split("_")
    if ($parts.Length -ge 3) {
        return @{
            material = $parts[0].Trim()
            provider = $parts[1].Trim()
            distributor = $parts[2].Trim()
        }
    } elseif ($parts.Length -eq 2) {
        return @{
            material = $parts[0].Trim()
            provider = $parts[1].Trim()
            distributor = "N/A"
        }
    } else {
        return @{
            material = $folderName
            provider = "N/A"
            distributor = "N/A"
        }
    }
}

function Scan-Folder ($folderPath, $folderType) {
    $results = @()
    if (-not (Test-Path $folderPath)) {
        Write-Output "Ruta no encontrada: $folderPath"
        return $results
    }
    
    $subfolders = Get-ChildItem -Path $folderPath -Directory
    foreach ($sub in $subfolders) {
        $parsed = Parse-FolderName $sub.Name
        $files = @()
        
        $childFiles = Get-ChildItem -Path $sub.FullName -File -Recurse
        foreach ($file in $childFiles) {
            $relPath = $file.FullName.Replace($backupRoot, "").TrimStart("\").Replace("\", "/")
            $category = Get-DocumentCategory $file.Name
            $sizeMb = [Math]::Round($file.Length / (1024 * 1024), 2)
            
            $files += @{
                name = $file.Name
                relative_path = $relPath
                size_mb = $sizeMb
                last_modified = $file.LastWriteTime.ToString("yyyy-MM-dd")
                category = $category
            }
        }
        
        $hasFt = $false
        $hasMsds = $false
        $hasCoa = $false
        foreach ($f in $files) {
            if ($f.category -eq "Ficha Tecnica") { $hasFt = $true }
            if ($f.category -eq "Hoja de Seguridad (MSDS)") { $hasMsds = $true }
            if ($f.category -eq "Certificado de Analisis (COA)") { $hasCoa = $true }
        }
        
        $score = 0
        if ($hasFt) { $score += 1 }
        if ($hasMsds) { $score += 1 }
        if ($hasCoa) { $score += 1 }
        
        $results += @{
            folder_name = $sub.Name
            folder_type = $folderType
            material = $parsed.material
            provider = $parsed.provider
            distributor = $parsed.distributor
            files_count = $files.Count
            files = $files
            has_ficha_tecnica = $hasFt
            has_msds = $hasMsds
            has_coa = $hasCoa
            completion_score = $score
        }
    }
    
    return $results
}

Write-Output "Iniciando escaneo..."

# Find target folders using wildcards to avoid encoding errors with accents
$provMpPath = "$basePath\MATERIAS PRIMAS_ PROVEEDORES 2026"
$materiaPrimaPath = "$basePath\MATERIA PRIMA"
$insumosPath = "$basePath\INSUMOS"
$serviciosPath = "$basePath\SERVICIOS"

$provAlcPath = ""
$maquilasPath = ""

if (Test-Path $basePath) {
    $dirItems = Get-ChildItem -Path $basePath -Directory
    foreach ($item in $dirItems) {
        if ($item.Name -like "*ALCOHOLICAS*") {
            $provAlcPath = $item.FullName
        }
        if ($item.Name -like "*MAQUILAS*") {
            $maquilasPath = $item.FullName
        }
    }
}

$allData = @{}
$totalProviders = 0
$totalFiles = 0

if ($provMpPath -and (Test-Path $provMpPath)) {
    Write-Output "Escaneando Proveedores Materias Primas 2026..."
    $scanned = Scan-Folder $provMpPath "Proveedores Materias Primas 2026"
    $allData["Proveedores Materias Primas 2026"] = $scanned
    $totalProviders += $scanned.Count
    foreach ($p in $scanned) { $totalFiles += $p.files_count }
}

if ($provAlcPath -and (Test-Path $provAlcPath)) {
    Write-Output "Escaneando Proveedores Alcoholicas..."
    $scanned = Scan-Folder $provAlcPath "Proveedores Alcoholicas"
    $allData["Proveedores Alcoholicas"] = $scanned
    $totalProviders += $scanned.Count
    foreach ($p in $scanned) { $totalFiles += $p.files_count }
}

if ($maquilasPath -and (Test-Path $maquilasPath)) {
    Write-Output "Escaneando Maquilas Clientes..."
    $scanned = Scan-Folder $maquilasPath "Maquilas Clientes"
    $allData["Maquilas Clientes"] = $scanned
    $totalProviders += $scanned.Count
    foreach ($p in $scanned) { $totalFiles += $p.files_count }
}

if ($materiaPrimaPath -and (Test-Path $materiaPrimaPath)) {
    Write-Output "Escaneando Proveedores Materia Prima..."
    $scanned = Scan-Folder $materiaPrimaPath "Proveedores Materia Prima"
    $allData["Proveedores Materia Prima"] = $scanned
    $totalProviders += $scanned.Count
    foreach ($p in $scanned) { $totalFiles += $p.files_count }
}

if ($insumosPath -and (Test-Path $insumosPath)) {
    Write-Output "Escaneando Proveedores Insumos..."
    $scanned = Scan-Folder $insumosPath "Proveedores Insumos"
    $allData["Proveedores Insumos"] = $scanned
    $totalProviders += $scanned.Count
    foreach ($p in $scanned) { $totalFiles += $p.files_count }
}

if ($serviciosPath -and (Test-Path $serviciosPath)) {
    Write-Output "Escaneando Proveedores Servicios..."
    $scanned = Scan-Folder $serviciosPath "Proveedores Servicios"
    $allData["Proveedores Servicios"] = $scanned
    $totalProviders += $scanned.Count
    foreach ($p in $scanned) { $totalFiles += $p.files_count }
}

$metadata = @{
    scan_time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    total_providers = $totalProviders
    total_files = $totalFiles
    backup_path = $backupRoot
}

$outputObject = @{
    metadata = $metadata
    data = $allData
}

# Serialize output to JSON and write to file with UTF-8 encoding
$json = ConvertTo-Json -InputObject $outputObject -Depth 100
[System.IO.File]::WriteAllText($outputPath, $json, [System.Text.Encoding]::UTF8)

# Write data.js to avoid CORS errors when opening index.html directly from local PC
$jsOutputPath = "C:\Users\User\Downloads\provedores\data.js"
$jsContent = "const PROVIDER_DATA = $json;"
[System.IO.File]::WriteAllText($jsOutputPath, $jsContent, [System.Text.Encoding]::UTF8)

Write-Output "Escaneo completado. Se encontraron $totalProviders proveedores y $totalFiles archivos."
Write-Output "Resultados guardados en: $outputPath y $jsOutputPath"
