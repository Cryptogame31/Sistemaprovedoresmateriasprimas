import os
import json
import re
from datetime import datetime

# Paths to scan
BACKUP_ROOT = r"C:\Users\User\Downloads\provedores_backup"
BASE_PATH = os.path.join(BACKUP_ROOT, "GC-MP-PG11 MATERIAS PRIMAS E INSUMOS")

def get_document_category(filename):
    fn = filename.lower()
    if any(k in fn for k in ["ficha tecnica", "ft ", "ft_", "tds", "technical data"]):
        return "Ficha Técnica"
    if any(k in fn for k in ["seguridad", "msds", "sds", "hs_", "safety data"]):
        return "Hoja de Seguridad (MSDS)"
    if any(k in fn for k in ["alergeno", "allergen"]):
        return "Declaración de Alérgenos"
    if any(k in fn for k in ["gmo", "gmo_", "non-gmo", "non gmo"]):
        return "Certificación GMO"
    if any(k in fn for k in ["metales", "pesados", "heavy", "metal"]):
        return "Metales Pesados"
    if "kosher" in fn:
        return "Certificación Kosher"
    if "halal" in fn:
        return "Certificación Halal"
    if "origen" in fn or "origin" in fn:
        return "Certificado de Origen"
    if any(k in fn for k in ["iso 22000", "iso22000", "fssc 22000", "fssc22000", "brc", "haccp"]):
        return "Certificación de Inocuidad (ISO/FSSC/BRC)"
    if "pesticid" in fn:
        return "Declaración de Pesticidas"
    if "micotox" in fn:
        return "Declaración de Micotoxinas"
    if "empaque" in fn or "migracion" in fn or "package" in fn or "packaging" in fn:
        return "Migración/Contacto Alimentos"
    if any(k in fn for k in ["certificado de calidad", "coa", "coad", "analisis", "analis"]):
        return "Certificado de Análisis (COA)"
    
    # Default category based on extension
    ext = os.path.splitext(fn)[1]
    if ext in [".pdf", ".docx", ".doc"]:
        return "Otros Documentos"
    return "Archivos de Registro / Otros"

def parse_folder_name(folder_name):
    # Try to parse name format like: [MATERIA PRIMA]_[FABRICANTE O PROVEEDOR]_[DISTRIBUIDOR/CLIENTE]
    parts = folder_name.split("_")
    if len(parts) >= 3:
        material = parts[0].strip()
        provider = parts[1].strip()
        distributor = parts[2].strip()
    elif len(parts) == 2:
        material = parts[0].strip()
        provider = parts[1].strip()
        distributor = "N/A"
    else:
        material = folder_name
        provider = "N/A"
        distributor = "N/A"
    return material, provider, distributor

def scan_folder(folder_path, folder_type):
    data = []
    if not os.path.exists(folder_path):
        return data
        
    for item in os.listdir(folder_path):
        item_path = os.path.join(folder_path, item)
        if os.path.isdir(item_path):
            material, provider, distributor = parse_folder_name(item)
            
            # Scan files inside this folder
            files = []
            for root, dirs, filenames in os.walk(item_path):
                for filename in filenames:
                    file_full_path = os.path.join(root, filename)
                    # Get size and modification time
                    try:
                        stat = os.stat(file_full_path)
                        size_mb = round(stat.st_size / (1024 * 1024), 2)
                        mtime = datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d')
                    except Exception:
                        size_mb = 0
                        mtime = "Desconocido"
                        
                    rel_path = os.path.relpath(file_full_path, BACKUP_ROOT)
                    category = get_document_category(filename)
                    
                    files.append({
                        "name": filename,
                        "relative_path": rel_path.replace("\\", "/"),
                        "size_mb": size_mb,
                        "last_modified": mtime,
                        "category": category
                    })
            
            # Determine status of critical documents
            has_ft = any(f["category"] == "Ficha Técnica" for f in files)
            has_msds = any(f["category"] == "Hoja de Seguridad (MSDS)" for f in files)
            has_coa = any(f["category"] == "Certificado de Análisis (COA)" for f in files)
            
            data.append({
                "folder_name": item,
                "folder_type": folder_type,
                "material": material,
                "provider": provider,
                "distributor": distributor,
                "files_count": len(files),
                "files": files,
                "has_ficha_tecnica": has_ft,
                "has_msds": has_msds,
                "has_coa": has_coa,
                "completion_score": sum([has_ft, has_msds, has_coa])
            })
            
    return data

def main():
    print("Iniciando escaneo de carpetas de proveedores...")
    
    # Areas to scan
    target_folders = {
        "Proveedores Materias Primas 2026": os.path.join(BASE_PATH, "MATERIAS PRIMAS_ PROVEEDORES 2026"),
        "Proveedores Alcohólicas": os.path.join(BASE_PATH, "INFORMACIÓN PROVEEDORES ALCOHOLICAS"),
        "Maquilas Clientes": os.path.join(BASE_PATH, "INFORMACIÓN MAQUILAS CLIENTES")
    }
    
    all_data = {}
    total_providers = 0
    total_files = 0
    
    for label, path in target_folders.items():
        print(f"Escaneando {label} en {path}...")
        scanned = scan_folder(path, label)
        all_data[label] = scanned
        total_providers += len(scanned)
        for p in scanned:
            total_files += p["files_count"]
            
    # Save output data.json
    output_path = os.path.join(os.path.dirname(__file__), "..", "data.json")
    output_path = os.path.abspath(output_path)
    
    metadata = {
        "scan_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "total_providers": total_providers,
        "total_files": total_files,
        "backup_path": BACKUP_ROOT
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"metadata": metadata, "data": all_data}, f, indent=2, ensure_ascii=False)
        
    print(f"Escaneo completado. Se encontraron {total_providers} proveedores y {total_files} archivos.")
    print(f"Resultados guardados en: {output_path}")

if __name__ == "__main__":
    main()
