# server.ps1 - Servidor HTTP nativo PowerShell para gestion de calidad
# Soporta CRUD de proveedores, categorias de carpeta, fabricantes, distribuidores, subida de archivos y sync Excel.

$Port = 8080
$WorkspaceRoot = (Get-Item $PSScriptRoot).Parent.FullName
$BackupRoot    = Join-Path (Split-Path $WorkspaceRoot -Parent) "provedores_backup"
$basePath      = "$BackupRoot\GC-MP-PG11 MATERIAS PRIMAS E INSUMOS"
$FabricantesRoot   = "$basePath\FABRICANTES"
$DistribuidoresRoot = "$basePath\DISTRIBUIDORES"

# ==========================================
# FUNCIONES HELPER
# ==========================================

function Has-Member($obj, $name) {
    return ($null -ne ($obj | Get-Member -Name $name -MemberType NoteProperty -ErrorAction SilentlyContinue))
}

function Get-CurrentData {
    $jsonPath = "$WorkspaceRoot\data.json"
    if (Test-Path $jsonPath) {
        $content = [System.IO.File]::ReadAllText($jsonPath, [System.Text.Encoding]::UTF8)
        return ConvertFrom-Json $content
    }
    return [PSCustomObject]@{ metadata = [PSCustomObject]@{}; data = [PSCustomObject]@{} }
}

function Save-Data($dataObj) {
    $totalFiles     = 0
    $totalProviders = 0
    foreach ($cat in $dataObj.data.PSObject.Properties) {
        $totalProviders += $cat.Value.Count
        foreach ($p in $cat.Value) { $totalFiles += $p.files_count }
    }
    $dataObj.metadata.total_providers = $totalProviders
    $dataObj.metadata.total_files     = $totalFiles
    $dataObj.metadata.scan_time       = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

    $json = ConvertTo-Json -InputObject $dataObj -Depth 100
    [System.IO.File]::WriteAllText("$WorkspaceRoot\data.json", $json, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText("$WorkspaceRoot\data.js",   "const PROVIDER_DATA = $json;", [System.Text.Encoding]::UTF8)
}

# Obtiene la carpeta fisica de una categoria
function Get-CategoryFolder($folderType, $db = $null) {
    if (-not $db) { $db = Get-CurrentData }

    if ($db.config -and $db.config.folder_types) {
        foreach ($ft in @($db.config.folder_types)) {
            if ($ft.name -eq $folderType) {
                return (Join-Path $basePath $ft.folder_name)
            }
        }
    }

    # Fallback estatico para compatibilidad
    switch ($folderType) {
        "Proveedores Materias Primas 2026" { return "$basePath\MATERIAS PRIMAS_ PROVEEDORES 2026" }
        "Proveedores Materia Prima"         { return "$basePath\MATERIA PRIMA" }
        "Proveedores Insumos"               { return "$basePath\INSUMOS" }
        "Proveedores Servicios"             { return "$basePath\SERVICIOS" }
    }
    return $null
}

# Inicializa la config por defecto si faltan campos
function Initialize-Config($db) {
    if (-not (Has-Member $db "config")) {
        $db | Add-Member -MemberType NoteProperty -Name "config" -Value ([PSCustomObject]@{}) -Force
    }

    $changed = $false

    # folder_types
    if (-not (Has-Member $db.config "folder_types")) {
        $defaultTypes = @(
            [PSCustomObject]@{ name = "Proveedores Materias Primas 2026"; folder_name = "MATERIAS PRIMAS_ PROVEEDORES 2026" },
            [PSCustomObject]@{ name = "Proveedores Materia Prima";         folder_name = "MATERIA PRIMA" },
            [PSCustomObject]@{ name = "Proveedores Insumos";               folder_name = "INSUMOS" },
            [PSCustomObject]@{ name = "Proveedores Servicios";             folder_name = "SERVICIOS" },
            [PSCustomObject]@{ name = "Proveedores Alcoholicas";           folder_name = "INFORMACION PROVEEDORES ALCOHOLICAS" },
            [PSCustomObject]@{ name = "Maquilas Clientes";                 folder_name = "INFORMACION MAQUILAS CLIENTES" }
        )
        $db.config | Add-Member -MemberType NoteProperty -Name "folder_types" -Value $defaultTypes -Force
        $changed = $true
    }

    # fabricante_entities
    if (-not (Has-Member $db.config "fabricante_entities")) {
        $entities = @()
        if ((Has-Member $db.config "fabricantes") -and $db.config.fabricantes) {
            foreach ($f in @($db.config.fabricantes)) {
                if ($f -is [string] -and $f.Trim() -ne "") {
                    $safeName = ($f -replace '[\\/:*?"<>|]', '_').ToUpper()
                    $entities += [PSCustomObject]@{ name = $f; folder_name = $safeName; nit = ""; contact = ""; cert = "" }
                }
            }
        }
        $db.config | Add-Member -MemberType NoteProperty -Name "fabricante_entities" -Value $entities -Force
        $changed = $true
    }

    # distribuidor_entities
    if (-not (Has-Member $db.config "distribuidor_entities")) {
        $entities = @()
        if ((Has-Member $db.config "distribuidores") -and $db.config.distribuidores) {
            foreach ($d in @($db.config.distribuidores)) {
                if ($d -is [string] -and $d.Trim() -ne "") {
                    $safeName = ($d -replace '[\\/:*?"<>|]', '_').ToUpper()
                    $entities += [PSCustomObject]@{ name = $d; folder_name = $safeName; nit = ""; contact = ""; cert = ""; role = "Ambos" }
                }
            }
        }
        $db.config | Add-Member -MemberType NoteProperty -Name "distribuidor_entities" -Value $entities -Force
        $changed = $true
    }

    return $changed
}

function Serve-StaticFile($context, $filePath) {
    $response = $context.Response
    if (Test-Path $filePath) {
        $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = "text/plain"
        switch ($ext) {
            ".html" { $mime = "text/html; charset=utf-8" }
            ".css"  { $mime = "text/css; charset=utf-8" }
            ".js"   { $mime = "application/javascript; charset=utf-8" }
            ".json" { $mime = "application/json; charset=utf-8" }
            ".png"  { $mime = "image/png" }
            ".jpg"  { $mime = "image/jpeg" }
            ".pdf"  { $mime = "application/pdf" }
        }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType = $mime
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
        $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $response.Close()
}

function Send-Json($response, $success, $message) {
    $response.ContentType = "application/json; charset=utf-8"
    $msg  = $message -replace '"', '\"'
    $flag = if ($success) { "true" } else { "false" }
    $json = "{`"success`": $flag, `"message`": `"$msg`"}"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.Close()
}

# ==========================================
# INICIAR SERVIDOR
# ==========================================

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add("http://localhost:$Port/")
try {
    $Listener.Start()
} catch {
    Write-Host "Puerto $Port ocupado. Intentando 8085..." -ForegroundColor Yellow
    $Port = 8085
    $Listener = New-Object System.Net.HttpListener
    $Listener.Prefixes.Add("http://localhost:$Port/")
    $Listener.Start()
}

# Inicializar config por defecto al arrancar
$initDb = Get-CurrentData
$initChanged = Initialize-Config $initDb
if ($initChanged) {
    Write-Host "Inicializando configuracion por defecto en data.json..." -ForegroundColor Yellow
    Save-Data $initDb
    Write-Host "Configuracion inicializada correctamente." -ForegroundColor Green
}

Write-Host "===============================================================" -ForegroundColor Green
Write-Host "  SERVIDOR ACTIVO EN: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Categorias, Fabricantes y Distribuidores con carpetas propias" -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "Presione Ctrl+C para detener."

# ==========================================
# LOOP PRINCIPAL
# ==========================================

while ($Listener.IsListening) {
    $context  = $Listener.GetContext()
    $request  = $context.Request
    $response = $context.Response
    $urlPath  = $request.Url.LocalPath
    Write-Host "$($request.HttpMethod) $urlPath" -ForegroundColor DarkGray

    # ==================================================
    # PROVEEDOR / REGISTRO MATERIA PRIMA - CREAR
    # ==================================================
    if ($urlPath -eq "/api/supplier/create" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $folderName  = $payload.folder_name
        $folderType  = $payload.folder_type

        $catDir = Get-CategoryFolder $folderType
        if ($catDir) {
            $fullPath = Join-Path $catDir $folderName
            if (-not (Test-Path $fullPath)) { New-Item -ItemType Directory -Path $fullPath -Force | Out-Null }
        }

        $db = Get-CurrentData
        if (-not (Has-Member $db.data $folderType)) {
            $db.data | Add-Member -MemberType NoteProperty -Name $folderType -Value @() -Force
        }

        $newSupplier = [PSCustomObject]@{
            folder_name   = $payload.folder_name
            folder_type   = $payload.folder_type
            material      = $payload.material
            provider      = $payload.provider
            distributor   = $payload.distributor
            codigo        = if (Has-Member $payload "codigo") { $payload.codigo } else { "" }
            cliente       = if (Has-Member $payload "cliente") { $payload.cliente } else { "" }
            riesgo_haccp  = if (Has-Member $payload "riesgo_haccp") { $payload.riesgo_haccp } else { "" }
            ft_year       = if (Has-Member $payload "ft_year") { $payload.ft_year } else { "" }
            ft_dist_year  = if (Has-Member $payload "ft_dist_year") { $payload.ft_dist_year } else { "" }
            acta_sanitaria = if (Has-Member $payload "acta_sanitaria") { [bool]$payload.acta_sanitaria } else { $false }
            certificacion = if (Has-Member $payload "certificacion") { [bool]$payload.certificacion } else { $false }
            cert_fecha    = if (Has-Member $payload "cert_fecha") { $payload.cert_fecha } else { "" }
            decl_alergenos = if (Has-Member $payload "decl_alergenos") { [bool]$payload.decl_alergenos } else { $false }
            decl_apto     = if (Has-Member $payload "decl_apto") { [bool]$payload.decl_apto } else { $false }
            analisis_fq   = if (Has-Member $payload "analisis_fq") { [bool]$payload.analisis_fq } else { $false }
            carta_fraude  = if (Has-Member $payload "carta_fraude") { [bool]$payload.carta_fraude } else { $false }
            carta_especificacion = if (Has-Member $payload "carta_especificacion") { [bool]$payload.carta_especificacion } else { $false }
            cartas_otras  = if (Has-Member $payload "cartas_otras") { [bool]$payload.cartas_otras } else { $false }
            files_count   = 0
            files         = @()
            completion_score = 0
        }

        $list = [System.Collections.ArrayList]::new(@($db.data.$folderType))
        $list.Add($newSupplier) | Out-Null
        $db.data.$folderType = $list.ToArray()
        Save-Data $db

        Send-Json $response $true "Materia prima creada correctamente"
    }

    # ==================================================
    # PROVEEDOR / REGISTRO MATERIA PRIMA - ACTUALIZAR
    # ==================================================
    elseif ($urlPath -eq "/api/supplier/update" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $oldName     = $payload.old_name
        $folderName  = $payload.folder_name
        $folderType  = $payload.folder_type

        $catDir = Get-CategoryFolder $folderType
        if ($catDir) {
            $oldPath = Join-Path $catDir $oldName
            $newPath = Join-Path $catDir $folderName
            if ($oldName -ne $folderName -and (Test-Path $oldPath)) {
                Rename-Item -Path $oldPath -NewName $folderName -Force
            }
        }

        $db = Get-CurrentData
        $updatedList = @()
        foreach ($s in @($db.data.$folderType)) {
            if ($s.folder_name -eq $oldName) {
                $s.folder_name = $payload.folder_name
                $s.material    = $payload.material
                $s.provider    = $payload.provider
                $s.distributor = $payload.distributor
                
                if (Has-Member $payload "codigo") { $s.codigo = $payload.codigo }
                if (Has-Member $payload "cliente") { $s.cliente = $payload.cliente }
                if (Has-Member $payload "riesgo_haccp") { $s.riesgo_haccp = $payload.riesgo_haccp }
                if (Has-Member $payload "ft_year") { $s.ft_year = $payload.ft_year }
                if (Has-Member $payload "ft_dist_year") { $s.ft_dist_year = $payload.ft_dist_year }
                if (Has-Member $payload "acta_sanitaria") { $s.acta_sanitaria = [bool]$payload.acta_sanitaria }
                if (Has-Member $payload "certificacion") { $s.certificacion = [bool]$payload.certificacion }
                if (Has-Member $payload "cert_fecha") { $s.cert_fecha = $payload.cert_fecha }
                if (Has-Member $payload "decl_alergenos") { $s.decl_alergenos = [bool]$payload.decl_alergenos }
                if (Has-Member $payload "decl_apto") { $s.decl_apto = [bool]$payload.decl_apto }
                if (Has-Member $payload "analisis_fq") { $s.analisis_fq = [bool]$payload.analisis_fq }
                if (Has-Member $payload "carta_fraude") { $s.carta_fraude = [bool]$payload.carta_fraude }
                if (Has-Member $payload "carta_especificacion") { $s.carta_especificacion = [bool]$payload.carta_especificacion }
                if (Has-Member $payload "cartas_otras") { $s.cartas_otras = [bool]$payload.cartas_otras }
            }
            $updatedList += $s
        }
        $db.data.$folderType = $updatedList
        Save-Data $db

        Send-Json $response $true "Materia prima actualizada correctamente"
    }

    # ==================================================
    # PROVEEDOR - ELIMINAR
    # ==================================================
    elseif ($urlPath -eq "/api/supplier/delete" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $folderName = $payload.folder_name
        $folderType = $payload.folder_type

        $catDir = Get-CategoryFolder $folderType
        if ($catDir) {
            $targetPath = Join-Path $catDir $folderName
            if (Test-Path $targetPath) { Remove-Item -Path $targetPath -Recurse -Force -ErrorAction SilentlyContinue }
        }

        $db = Get-CurrentData
        $updatedList = @()
        foreach ($s in @($db.data.$folderType)) {
            if ($s.folder_name -ne $folderName) { $updatedList += $s }
        }
        $db.data.$folderType = $updatedList
        Save-Data $db

        Send-Json $response $true "Materia prima eliminada correctamente"
    }

    # ==================================================
    # ARCHIVO - SUBIR
    # ==================================================
    elseif ($urlPath -eq "/api/upload" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $fileName    = $payload.file_name
        $fileType    = $payload.file_type
        $fileDataB64 = $payload.file_data
        $folderName  = $payload.folder_name
        $folderType  = $payload.folder_type

        $catDir = Get-CategoryFolder $folderType
        if ($catDir) {
            $supplierDir = Join-Path $catDir $folderName
            if (-not (Test-Path $supplierDir)) { New-Item -ItemType Directory -Path $supplierDir -Force | Out-Null }
            $filePath  = Join-Path $supplierDir $fileName
            $fileBytes = [System.Convert]::FromBase64String($fileDataB64)
            [System.IO.File]::WriteAllBytes($filePath, $fileBytes)

            $db = Get-CurrentData
            $updatedList = @()
            foreach ($s in @($db.data.$folderType)) {
                if ($s.folder_name -eq $folderName) {
                    $files = @()
                    $childFiles = Get-ChildItem -Path $supplierDir -File -Recurse
                    foreach ($file in $childFiles) {
                        $relPath = $file.FullName.Replace($BackupRoot, "").TrimStart("\").Replace("\", "/")
                        $cat = $fileType
                        if ($file.Name -ne $fileName) {
                            $cat = "Otros Documentos"
                            $fn = $file.Name.ToLower()
                            if ($fn -match "ficha.tecnica|^ft[_ ]|tds|technical.data") { $cat = "Ficha Técnica (FT)" }
                            elseif ($fn -match "msds|hoja.seguridad|sds|safety.data")  { $cat = "Hoja de Seguridad (MSDS)" }
                            elseif ($fn -match "coa|certificado.calidad|analysis")     { $cat = "Certificado de Análisis (COA)" }
                            elseif ($fn -match "acta|sanitaria")                       { $cat = "Acta Sanitaria" }
                            elseif ($fn -match "certificacion|iso|fssc|brc")            { $cat = "Certificación Proveedor" }
                            elseif ($fn -match "alergenos|allergen")                   { $cat = "Declaración de Alérgenos" }
                            elseif ($fn -match "alimento|contacto|envase|tapa")        { $cat = "Declaración Apto Alimentos" }
                            elseif ($fn -match "fq|fisicoquimico|fq-")                 { $cat = "Análisis FQ" }
                            elseif ($fn -match "fraude")                               { $cat = "Carta Fraude" }
                            elseif ($fn -match "especificacion|especificac")           { $cat = "Carta Especificacion" }
                        }
                        $files += [PSCustomObject]@{
                            name = $file.Name; relative_path = $relPath
                            size_mb = [Math]::Round($file.Length / (1024*1024), 2)
                            last_modified = $file.LastWriteTime.ToString("yyyy-MM-dd")
                            category = $cat
                        }
                    }
                    $s.files = $files; $s.files_count = $files.Count
                    
                    $s.has_ficha_tecnica = [bool]($files | Where-Object { $_.category -eq "Ficha Técnica (FT)" })
                    $s.has_msds          = [bool]($files | Where-Object { $_.category -eq "Hoja de Seguridad (MSDS)" })
                    $s.has_coa           = [bool]($files | Where-Object { $_.category -eq "Certificado de Análisis (COA)" })
                    
                    $score = 0
                    if ($s.has_ficha_tecnica) { $score++ }
                    if ($s.has_msds)          { $score++ }
                    if ($s.has_coa)           { $score++ }
                    $s.completion_score = $score
                }
                $updatedList += $s
            }
            $db.data.$folderType = $updatedList
            Save-Data $db
        }

        Send-Json $response $true "Documento subido y registrado correctamente"
    }

    # ==================================================
    # ARCHIVO - ELIMINAR
    # ==================================================
    elseif ($urlPath -eq "/api/file/delete" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $relativePath = $payload.relative_path
        $folderName   = $payload.folder_name
        $folderType   = $payload.folder_type

        $filePath = Join-Path $BackupRoot $relativePath
        if (Test-Path $filePath) { Remove-Item -Path $filePath -Force -ErrorAction SilentlyContinue }

        $db = Get-CurrentData
        $updatedList = @()
        foreach ($s in @($db.data.$folderType)) {
            if ($s.folder_name -eq $folderName) {
                $files = @($s.files | Where-Object { $_.relative_path -ne $relativePath })
                $s.files = $files; $s.files_count = $files.Count
                $s.has_ficha_tecnica = [bool]($files | Where-Object { $_.category -eq "Ficha Técnica (FT)" })
                $s.has_msds          = [bool]($files | Where-Object { $_.category -eq "Hoja de Seguridad (MSDS)" })
                $s.has_coa           = [bool]($files | Where-Object { $_.category -eq "Certificado de Análisis (COA)" })
                $score = 0
                if ($s.has_ficha_tecnica) { $score++ }
                if ($s.has_msds)          { $score++ }
                if ($s.has_coa)           { $score++ }
                $s.completion_score = $score
            }
            $updatedList += $s
        }
        $db.data.$folderType = $updatedList
        Save-Data $db

        Send-Json $response $true "Archivo eliminado correctamente"
    }

    # ==================================================
    # CONFIG - ACTUALIZAR
    # ==================================================
    elseif ($urlPath -eq "/api/config/update" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $db = Get-CurrentData
        if (-not (Has-Member $db "config")) {
            $db | Add-Member -MemberType NoteProperty -Name "config" -Value $payload -Force
        } else {
            $db.config = $payload
        }
        Save-Data $db

        Send-Json $response $true "Configuracion guardada correctamente"
    }

    # ==================================================
    # CATEGORIA DE CARPETA - CREAR
    # ==================================================
    elseif ($urlPath -eq "/api/folder-type/create" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $name          = $payload.name
        $folderNameVal = $payload.folder_name

        $newDir = Join-Path $basePath $folderNameVal
        if (-not (Test-Path $newDir)) { New-Item -ItemType Directory -Path $newDir -Force | Out-Null }

        $db      = Get-CurrentData
        $newType = [PSCustomObject]@{ name = $name; folder_name = $folderNameVal }
        $list    = [System.Collections.ArrayList]::new(@($db.config.folder_types))
        $list.Add($newType) | Out-Null
        $db.config.folder_types = $list.ToArray()

        if (-not (Has-Member $db.data $name)) {
            $db.data | Add-Member -MemberType NoteProperty -Name $name -Value @() -Force
        }

        Save-Data $db
        Send-Json $response $true "Categoria de carpeta creada correctamente"
    }

    # ==================================================
    # CATEGORIA DE CARPETA - ACTUALIZAR
    # ==================================================
    elseif ($urlPath -eq "/api/folder-type/update" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $oldName       = $payload.old_name
        $newName       = $payload.name
        $oldFolderName = $payload.old_folder_name
        $newFolderName = $payload.folder_name

        $oldDir = Join-Path $basePath $oldFolderName
        if ($oldFolderName -ne $newFolderName -and (Test-Path $oldDir)) {
            Rename-Item -Path $oldDir -NewName $newFolderName -Force
        }

        $db = Get-CurrentData

        $updatedTypes = @()
        foreach ($ft in @($db.config.folder_types)) {
            if ($ft.name -eq $oldName) {
                $updatedTypes += [PSCustomObject]@{ name = $newName; folder_name = $newFolderName }
            } else { $updatedTypes += $ft }
        }
        $db.config.folder_types = $updatedTypes

        if ($oldName -ne $newName -and (Has-Member $db.data $oldName)) {
            $entries = @($db.data.$oldName)
            $updatedEntries = @()
            foreach ($s in $entries) {
                $s.folder_type = $newName
                if ($s.files -and $oldFolderName -ne $newFolderName) {
                    $updatedFiles = @()
                    foreach ($f in @($s.files)) {
                        $f.relative_path = $f.relative_path -replace [regex]::Escape("/$oldFolderName/"), "/$newFolderName/"
                        $updatedFiles += $f
                    }
                    $s.files = $updatedFiles
                }
                $updatedEntries += $s
            }

            if (-not (Has-Member $db.data $newName)) {
                $db.data | Add-Member -MemberType NoteProperty -Name $newName -Value $updatedEntries -Force
            } else {
                $combined = [System.Collections.ArrayList]::new(@($db.data.$newName))
                foreach ($e in $updatedEntries) { $combined.Add($e) | Out-Null }
                $db.data.$newName = $combined.ToArray()
            }

            $newDataObj = [PSCustomObject]@{}
            foreach ($prop in $db.data.PSObject.Properties) {
                if ($prop.Name -ne $oldName) {
                    $newDataObj | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
                }
            }
            $db.data = $newDataObj
        }

        Save-Data $db
        Send-Json $response $true "Categoria de carpeta actualizada correctamente"
    }

    # ==================================================
    # CATEGORIA DE CARPETA - ELIMINAR
    # ==================================================
    elseif ($urlPath -eq "/api/folder-type/delete" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $name           = $payload.name
        $folderNameVal  = $payload.folder_name
        $deletePhysical = $payload.delete_physical

        if ($deletePhysical) {
            $targetDir = Join-Path $basePath $folderNameVal
            if (Test-Path $targetDir) { Remove-Item -Path $targetDir -Recurse -Force -ErrorAction SilentlyContinue }
        }

        $db = Get-CurrentData
        $db.config.folder_types = @($db.config.folder_types | Where-Object { $_.name -ne $name })

        $newDataObj = [PSCustomObject]@{}
        foreach ($prop in $db.data.PSObject.Properties) {
            if ($prop.Name -ne $name) {
                $newDataObj | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
            }
        }
        $db.data = $newDataObj

        Save-Data $db
        Send-Json $response $true "Categoria de carpeta eliminada correctamente"
    }

    # ==================================================
    # ENTIDAD (Fabricante/Distribuidor) - CREAR (Con NIT, Contacto, Rol y Certificación)
    # ==================================================
    elseif ($urlPath -eq "/api/entity/create" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $entityType    = $payload.entity_type
        $name          = $payload.name
        $folderNameVal = $payload.folder_name

        $entityRootDir = if ($entityType -eq "fabricante_entities") { $FabricantesRoot } else { $DistribuidoresRoot }
        if (-not (Test-Path $entityRootDir)) { New-Item -ItemType Directory -Path $entityRootDir -Force | Out-Null }

        $entityDir = Join-Path $entityRootDir $folderNameVal
        if (-not (Test-Path $entityDir)) { New-Item -ItemType Directory -Path $entityDir -Force | Out-Null }

        $db = Get-CurrentData
        
        # Build Entity object dynamically preserving all fields
        $newEntity = [PSCustomObject]@{
            name        = $name
            folder_name = $folderNameVal
            nit         = if (Has-Member $payload "nit") { $payload.nit } else { "" }
            contact     = if (Has-Member $payload "contact") { $payload.contact } else { "" }
            cert        = if (Has-Member $payload "cert") { $payload.cert } else { "" }
            role        = if (Has-Member $payload "role") { $payload.role } else { "Ambos" }
        }

        $entityList = [System.Collections.ArrayList]::new(@($db.config.$entityType))
        $entityList.Add($newEntity) | Out-Null
        $db.config.$entityType = $entityList.ToArray()

        $simpleKey = if ($entityType -eq "fabricante_entities") { "fabricantes" } else { "distribuidores" }
        if (Has-Member $db.config $simpleKey) {
            $simpleList = [System.Collections.ArrayList]::new(@($db.config.$simpleKey))
            if (-not $simpleList.Contains($name)) {
                $simpleList.Add($name) | Out-Null
                $db.config.$simpleKey = ($simpleList.ToArray() | Sort-Object)
            }
        }

        Save-Data $db
        Send-Json $response $true "Entidad registrada con éxito"
    }

    # ==================================================
    # ENTIDAD (Fabricante/Distribuidor) - ACTUALIZAR (Con NIT, Contacto, Rol y Certificación)
    # ==================================================
    elseif ($urlPath -eq "/api/entity/update" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $entityType    = $payload.entity_type
        $oldName       = $payload.old_name
        $newName       = $payload.name
        $oldFolderName = $payload.old_folder_name
        $newFolderName = $payload.folder_name

        $entityRootDir = if ($entityType -eq "fabricante_entities") { $FabricantesRoot } else { $DistribuidoresRoot }

        $oldDir = Join-Path $entityRootDir $oldFolderName
        if ($oldFolderName -ne $newFolderName -and (Test-Path $oldDir)) {
            Rename-Item -Path $oldDir -NewName $newFolderName -Force
        }

        $db = Get-CurrentData

        $updatedEntities = @()
        foreach ($e in @($db.config.$entityType)) {
            if ($e.name -eq $oldName) {
                $updatedEntities += [PSCustomObject]@{
                    name        = $newName
                    folder_name = $newFolderName
                    nit         = if (Has-Member $payload "nit") { $payload.nit } else { "" }
                    contact     = if (Has-Member $payload "contact") { $payload.contact } else { "" }
                    cert        = if (Has-Member $payload "cert") { $payload.cert } else { "" }
                    role        = if (Has-Member $payload "role") { $payload.role } else { "Ambos" }
                }
            } else { $updatedEntities += $e }
        }
        $db.config.$entityType = $updatedEntities

        $simpleKey = if ($entityType -eq "fabricante_entities") { "fabricantes" } else { "distribuidores" }
        if (Has-Member $db.config $simpleKey) {
            $db.config.$simpleKey = @(@($db.config.$simpleKey) | ForEach-Object {
                if ($_ -eq $oldName) { $newName } else { $_ }
            }) | Sort-Object
        }

        # Propagar cambio de nombre a todos los registros de proveedores
        $providerField = if ($entityType -eq "fabricante_entities") { "provider" } else { "distributor" }
        foreach ($cat in $db.data.PSObject.Properties) {
            $updatedList = @()
            foreach ($s in @($cat.Value)) {
                if ($s.$providerField -eq $oldName) { $s.$providerField = $newName }
                $updatedList += $s
            }
            $db.data.PSObject.Properties[$cat.Name].Value = $updatedList
        }

        Save-Data $db
        Send-Json $response $true "Entidad actualizada y cambios propagados"
    }

    # ==================================================
    # ENTIDAD (Fabricante/Distribuidor) - ELIMINAR
    # ==================================================
    elseif ($urlPath -eq "/api/entity/delete" -and $request.HttpMethod -eq "POST") {
        $reader  = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
        $payload = ConvertFrom-Json ($reader.ReadToEnd())

        $entityType     = $payload.entity_type
        $name           = $payload.name
        $folderNameVal  = $payload.folder_name
        $deletePhysical = $payload.delete_physical

        $entityRootDir = if ($entityType -eq "fabricante_entities") { $FabricantesRoot } else { $DistribuidoresRoot }

        if ($deletePhysical) {
            $targetDir = Join-Path $entityRootDir $folderNameVal
            if (Test-Path $targetDir) { Remove-Item -Path $targetDir -Recurse -Force -ErrorAction SilentlyContinue }
        }

        $db = Get-CurrentData
        $db.config.$entityType = @($db.config.$entityType | Where-Object { $_.name -ne $name })

        $simpleKey = if ($entityType -eq "fabricante_entities") { "fabricantes" } else { "distribuidores" }
        if (Has-Member $db.config $simpleKey) {
            $db.config.$simpleKey = @($db.config.$simpleKey | Where-Object { $_ -ne $name })
        }

        Save-Data $db
        Send-Json $response $true "Entidad eliminada del catalogo"
    }

    # ==================================================
    # SYNC EXCEL
    # ==================================================
    elseif ($urlPath -eq "/api/sync" -and $request.HttpMethod -eq "POST") {
        Write-Host "Iniciando sincronizacion con Excel..." -ForegroundColor Yellow
        $scriptPath = "$WorkspaceRoot\scripts\populate_from_drive.ps1"
        Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$scriptPath`"" -WindowStyle Hidden -Wait
        Send-Json $response $true "Sincronizacion completada con el Excel!"
    }

    # ==================================================
    # VER ARCHIVOS (Evita bloqueo de protocolo file:// en navegadores)
    # ==================================================
    elseif ($urlPath -eq "/api/file/view" -and $request.HttpMethod -eq "GET") {
        $relPath = $request.QueryString["path"]
        $filePath = Join-Path $BackupRoot $relPath
        if (Test-Path $filePath) {
            Serve-StaticFile $context $filePath
        } else {
            $response.StatusCode = 404
            $response.Close()
        }
    }

    # ==================================================
    # API DATA
    # ==================================================
    elseif ($urlPath -eq "/api/data" -and $request.HttpMethod -eq "GET") {
        $jsonPath = "$WorkspaceRoot\data.json"
        $response.ContentType = "application/json; charset=utf-8"
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        if (Test-Path $jsonPath) {
            $bytes = [System.IO.File]::ReadAllBytes($jsonPath)
        } else {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"metadata":{},"data":{}}')
        }
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
        $response.Close()
    }

    # ==================================================
    # ARCHIVOS ESTATICOS
    # ==================================================
    else {
        $fileName = $urlPath
        if ($fileName -eq "/" -or [string]::IsNullOrEmpty($fileName)) { $fileName = "/index.html" }
        $targetFile = Join-Path $WorkspaceRoot $fileName.Replace("/", "\")
        Serve-StaticFile $context $targetFile
    }
}

$Listener.Stop()
