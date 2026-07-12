// ============================================================
// GLOBAL STATE
// ============================================================
let appData          = null;
let currentSuppliers = [];
let selectedSupplier = null;
let uploadFileBytes  = null;
let uploadFileName   = "";
let activeWorkspaceTab = "planilla";

// Available document checklist targets (custom configuration)
const CHECKLIST_FIELDS = [
  { id: 'acta_sanitaria',      label: 'Acta Sanitaria',      short: 'ACTA' },
  { id: 'certificacion',       label: 'Certificación ISO/FSSC', short: 'CERT' },
  { id: 'decl_alergenos',      label: 'Decl. Alérgenos',     short: 'ALERG' },
  { id: 'decl_apto',           label: 'Apto Alimentos',      short: 'APTO' },
  { id: 'analisis_fq',         label: 'Análisis FQ',         short: 'FQ' },
  { id: 'carta_fraude',        label: 'Carta Fraude',        short: 'FRAU' },
  { id: 'carta_especificacion', label: 'Carta Especif.',      short: 'SPEC' },
  { id: 'cartas_otras',        label: 'Otras Cartas',        short: 'OTRA' }
];

const ALL_POSSIBLE_CATEGORIES = [
  { category: "Ficha Técnica (FT)",                  short: "FT",     desc: "Ficha Técnica" },
  { category: "Certificado de Análisis (COA)",       short: "COA",    desc: "Certificado de Calidad (COA)" },
  { category: "Hoja de Seguridad (MSDS)",            short: "MSDS",   desc: "Hoja de Seguridad (MSDS)" },
  { category: "Acta Sanitaria",                      short: "ACTA",   desc: "Acta Sanitaria Interna" },
  { category: "Certificación Proveedor",             short: "CERT",   desc: "Certificación del Proveedor" },
  { category: "Declaración de Alérgenos",            short: "ALERG",  desc: "Declaración de Alérgenos" },
  { category: "Declaración Apto Alimentos",          short: "APTO",   desc: "Apto para Contacto con Alimentos" },
  { category: "Análisis FQ",                         short: "FQ",     desc: "Análisis Fisicoquímico (FQ)" },
  { category: "Carta Fraude",                        short: "FRAU",   desc: "Carta de Fraude" },
  { category: "Carta Especificacion",                short: "SPEC",   desc: "Carta de Especificación" },
  { category: "Otros Documentos",                    short: "OTRO",   desc: "Otros Documentos" }
];

const DEFAULT_FOLDER_TYPES = [
  { name: "Proveedores Materias Primas 2026", folder_name: "MATERIAS PRIMAS_ PROVEEDORES 2026" },
  { name: "Proveedores Materia Prima",         folder_name: "MATERIA PRIMA" },
  { name: "Proveedores Insumos",               folder_name: "INSUMOS" },
  { name: "Proveedores Servicios",             folder_name: "SERVICIOS" },
  { name: "Proveedores Alcoholicas",           folder_name: "INFORMACION PROVEEDORES ALCOHOLICAS" },
  { name: "Maquilas Clientes",                 folder_name: "INFORMACION MAQUILAS CLIENTES" }
];

// Badge color palette for dynamic types
const TYPE_PALETTE = [
  'type-mp', 'type-alc', 'type-maq', 'type-insumo',
  'type-servicio', 'type-custom1', 'type-custom2', 'type-custom3', 'type-custom4'
];

// ============================================================
// DOM REFERENCES
// ============================================================
const isServerMode         = window.location.protocol.startsWith('http');
const searchInput          = document.getElementById('search-input');
const filterType           = document.getElementById('filter-type');
const filterStatus         = document.getElementById('filter-status');
const filterFabricante     = document.getElementById('filter-fabricante');
const filterDistribuidor   = document.getElementById('filter-distribuidor');
const filterHaccp          = document.getElementById('filter-haccp');
const resultsCount         = document.getElementById('results-count');
const supplierGrid         = document.getElementById('supplier-grid');

// Stats
const statTotalSuppliers  = document.getElementById('stat-total-suppliers');
const statTotalFiles      = document.getElementById('stat-total-files');
const statCompleteCount   = document.getElementById('stat-complete-count');
const statIncompleteCount = document.getElementById('stat-incomplete-count');
const statUniqueMaterials = document.getElementById('stat-unique-materials');
const lastUpdateText      = document.getElementById('last-update');

// Tabs buttons & contents
const tabBtnPlanilla      = document.getElementById('tab-btn-planilla');
const tabBtnCatalogos     = document.getElementById('tab-btn-catalogos');
const tabBtnDocumentacion = document.getElementById('tab-btn-documentacion');

const contentPlanilla      = document.getElementById('content-planilla');
const contentCatalogos     = document.getElementById('content-catalogos');
const contentDocumentacion = document.getElementById('content-documentacion');

// Drawer
const drawerBackdrop   = document.getElementById('drawer-backdrop');
const drawer           = document.getElementById('drawer');
const drawerTitle      = document.getElementById('drawer-title');
const drawerMaterial   = document.getElementById('drawer-material');
const drawerProvider   = document.getElementById('drawer-provider');
const drawerDistributor = document.getElementById('drawer-distributor');
const drawerCliente    = document.getElementById('drawer-cliente');
const drawerCodigo     = document.getElementById('drawer-codigo');
const drawerCategoria  = document.getElementById('drawer-categoria');
const drawerHaccp      = document.getElementById('drawer-haccp');
const drawerType       = document.getElementById('drawer-type');
const drawerDocStatus  = document.getElementById('drawer-doc-status');
const drawerFileList   = document.getElementById('drawer-file-list');
const drawerFileSearch = document.getElementById('drawer-file-search');
const drawerRelatedList = document.getElementById('drawer-related-list');
const btnCloseDrawer   = document.getElementById('btn-close-drawer');

// Supplier Modal Form
const supplierModalBackdrop   = document.getElementById('supplier-modal-backdrop');
const supplierModalTitle      = document.getElementById('supplier-modal-title');
const supplierOldName         = document.getElementById('supplier-old-name');
const supplierNameInput       = document.getElementById('supplier-name');
const supplierFolderType      = document.getElementById('supplier-folder-type');
const supplierMaterialInput   = document.getElementById('supplier-material');
const supplierCodigoInput     = document.getElementById('supplier-codigo');
const supplierClienteInput    = document.getElementById('supplier-cliente');
const supplierHaccpSelect     = document.getElementById('supplier-riesgo-haccp');
const supplierFtYearInput     = document.getElementById('supplier-ft-year');
const supplierFtDistYearInput = document.getElementById('supplier-ft-dist-year');

const chkActaSanitaria       = document.getElementById('chk-acta-sanitaria');
const chkCertificacion        = document.getElementById('chk-certificacion');
const certFechaGroup         = document.getElementById('cert-fecha-group');
const supplierCertFechaInput = document.getElementById('supplier-cert-fecha');
const chkDeclAlergenos       = document.getElementById('chk-decl-alergenos');
const chkDeclApto            = document.getElementById('chk-decl-apto');
const chkAnalisisFq          = document.getElementById('chk-analisis-fq');
const chkCartaFraude         = document.getElementById('chk-carta-fraude');
const chkCartaEspecificacion = document.getElementById('chk-carta-especificacion');
const chkCartasOtras         = document.getElementById('chk-cartas-otras');

const supplierProviderSelect  = document.getElementById('supplier-provider-select');
const supplierProviderText    = document.getElementById('supplier-provider-text');
const btnToggleProviderInput  = document.getElementById('btn-toggle-provider-input');
const supplierDistributorSelect = document.getElementById('supplier-distributor-select');
const supplierDistributorText   = document.getElementById('supplier-distributor-text');
const btnToggleDistributorInput = document.getElementById('btn-toggle-distributor-input');
const btnSaveSupplier         = document.getElementById('btn-save-supplier');
const btnCloseSupplierModal   = document.getElementById('btn-close-supplier-modal');
const btnCancelSupplierModal  = document.getElementById('btn-cancel-supplier-modal');

// Upload Modal
const uploadModalBackdrop  = document.getElementById('upload-modal-backdrop');
const uploadDocType        = document.getElementById('upload-doc-type');
const uploadFileInput      = document.getElementById('upload-file-input');
const dropZone             = document.getElementById('drop-zone');
const uploadFileNameDisplay = document.getElementById('upload-file-name');
const btnSubmitUpload      = document.getElementById('btn-submit-upload');
const btnCloseUploadModal  = document.getElementById('btn-close-upload-modal');
const btnCancelUploadModal = document.getElementById('btn-cancel-upload-modal');

// Config and Checklist Management
const configChecklistList  = document.getElementById('config-checklist-list');
const configSearchInput    = document.getElementById('config-search-input');
const btnSaveConfig        = document.getElementById('btn-save-config');

// Catalog Panel
const catalogSelectType      = document.getElementById('catalog-select-type');
const catalogNewItemInput    = document.getElementById('catalog-new-item-input');
const catalogNewFolderInput  = document.getElementById('catalog-new-folder-input');
const catalogFolderGroup     = document.getElementById('catalog-folder-group');
const catalogFolderLabel     = document.getElementById('catalog-folder-label');
const catalogContextInfo     = document.getElementById('catalog-context-info');
const btnCatalogAddItem      = document.getElementById('btn-catalog-add-item');
const catalogItemsList       = document.getElementById('catalog-items-list');
const catalogSearchInput     = document.getElementById('catalog-search-input');
const catalogCountBadge      = document.getElementById('catalog-count-badge');

// Toast & Action buttons
const toastNotify     = document.getElementById('toast-notify');
const toastIcon       = document.getElementById('toast-icon');
const toastMessage    = document.getElementById('toast-message');
const btnNewSupplier  = document.getElementById('btn-new-supplier');
const btnSyncExcel    = document.getElementById('btn-sync-excel');
const btnEditSupplier    = document.getElementById('btn-edit-supplier');
const btnDeleteSupplier  = document.getElementById('btn-delete-supplier');
const btnUploadDoc       = document.getElementById('btn-upload-doc');

// Input mode toggles
let providerInputMode    = 'select';
let distributorInputMode = 'select';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  fetchData();
  setupEventListeners();
  if (!isServerMode) {
    showToast('Modo de solo lectura. Lance server.ps1 para poder editar.', 'warning');
    [btnNewSupplier, btnSyncExcel, btnSaveConfig, btnCatalogAddItem]
      .forEach(b => { if (b) b.style.opacity = '0.5'; });
  }
});

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toastNotify.className = `toast active ${type}`;
  toastIcon.textContent = type === 'success' ? '✅' : type === 'danger' ? '❌' : '⚠️';
  setTimeout(() => toastNotify.classList.remove('active'), 4500);
}

// ============================================================
// FETCH DATA
// ============================================================
async function fetchData() {
  try {
    let result = null;
    if (isServerMode) {
      const r = await fetch('/api/data?' + Date.now());
      if (r.ok) result = await r.json();
    }
    if (!result) {
      if (typeof window !== 'undefined' && window.PROVIDER_DATA) result = window.PROVIDER_DATA;
      else if (typeof PROVIDER_DATA !== 'undefined') result = PROVIDER_DATA;
      else { const r = await fetch('data.json'); if (r.ok) result = await r.json(); }
    }
    if (!result) throw new Error('Base de datos no encontrada');

    appData = result;
    if (!appData.config)                      appData.config = {};
    if (!appData.config.checklist_categories) appData.config.checklist_categories = ALL_POSSIBLE_CATEGORIES.slice(0, 3);
    if (!appData.config.folder_types || !appData.config.folder_types.length)
      appData.config.folder_types = DEFAULT_FOLDER_TYPES;

    // Normalize entities
    if (!appData.config.fabricante_entities) appData.config.fabricante_entities = [];
    if (!appData.config.distribuidor_entities) appData.config.distribuidor_entities = [];

    // Build flat supplier list
    currentSuppliers = [];
    Object.keys(appData.data).forEach(category => {
      appData.data[category].forEach(supplier => {
        // Calculate score
        let score = 0;
        const hasFT = supplier.files?.some(f => f.category === "Ficha Técnica (FT)") || supplier.ft_year || supplier.ft_dist_year;
        const hasMSDS = supplier.files?.some(f => f.category === "Hoja de Seguridad (MSDS)");
        const hasCOA = supplier.files?.some(f => f.category === "Certificado de Análisis (COA)");
        
        if (hasFT) score++;
        if (hasMSDS) score++;
        if (hasCOA) score++;

        supplier.completion_score = score;
        currentSuppliers.push(supplier);
      });
    });

    populateFolderTypeDropdowns();
    populateCatalogsDropdowns();
    updateStats();
    applyFilters();
    renderConfigChecklist();
    updateCatalogUI();
    renderCatalogItemsList();
  } catch (err) {
    console.error(err);
    supplierGrid.innerHTML = `<div class="empty-state"><i style="color:#ef4444">⚠️</i><p>Error al cargar la base de datos.</p></div>`;
  }
}

// ============================================================
// STATS
// ============================================================
function updateStats() {
  if (!appData) return;
  statTotalSuppliers.textContent = currentSuppliers.length;
  statTotalFiles.textContent     = currentSuppliers.reduce((sum, s) => sum + (s.files?.length || 0), 0);
  lastUpdateText.textContent     = appData.metadata?.scan_time || '-';

  let complete = 0, incomplete = 0;
  const uniqueMaterials = new Set();
  currentSuppliers.forEach(s => {
    if (s.material) uniqueMaterials.add(s.material.trim().toUpperCase());
    if (s.completion_score === 3) complete++;
    else incomplete++;
  });
  statCompleteCount.textContent  = complete;
  statIncompleteCount.textContent = incomplete;
  statUniqueMaterials.textContent = uniqueMaterials.size;
}

// ============================================================
// TAB NAVIGATION SYSTEM
// ============================================================
function switchWorkspaceTab(tabId) {
  activeWorkspaceTab = tabId;
  
  // Update button active states
  tabBtnPlanilla.classList.toggle('active', tabId === 'planilla');
  tabBtnCatalogos.classList.toggle('active', tabId === 'catalogos');
  tabBtnDocumentacion.classList.toggle('active', tabId === 'documentacion');

  // Update content view displays
  contentPlanilla.style.display = tabId === 'planilla' ? 'grid' : 'none';
  contentCatalogos.style.display = tabId === 'catalogos' ? 'block' : 'none';
  contentDocumentacion.style.display = tabId === 'documentacion' ? 'block' : 'none';
  
  if (tabId === 'catalogos') {
    updateCatalogUI();
    renderCatalogItemsList();
  } else if (tabId === 'documentacion') {
    renderConfigChecklist();
  }
}

// ============================================================
// FILTERS & RENDER TABLE
// ============================================================
function applyFilters() {
  if (!appData) return;
  const query     = searchInput.value.toLowerCase().trim();
  const typeVal   = filterType.value;
  const fabVal    = filterFabricante.value;
  const distVal   = filterDistribuidor.value;
  const haccpVal  = filterHaccp.value;
  const statusVal = filterStatus.value;

  let filtered = currentSuppliers.filter(s => {
    const matchSearch = (s.codigo || '').toLowerCase().includes(query)
      || (s.material || '').toLowerCase().includes(query)
      || (s.provider || '').toLowerCase().includes(query)
      || (s.distributor || '').toLowerCase().includes(query)
      || (s.cliente || '').toLowerCase().includes(query);
      
    const matchType  = typeVal === 'all'  || s.folder_type === typeVal;
    const matchFab   = fabVal  === 'all'  || s.provider === fabVal;
    const matchDist  = distVal === 'all'  || s.distributor === distVal;
    const matchHaccp = haccpVal === 'all' || s.riesgo_haccp === haccpVal;

    let matchStatus = true;
    if (statusVal === 'complete') {
      matchStatus = s.completion_score === 3;
    } else if (statusVal === 'pending') {
      matchStatus = s.completion_score < 3;
    } else if (statusVal === 'missing_ft') {
      matchStatus = !s.files?.some(f => f.category === "Ficha Técnica (FT)") && !s.ft_year && !s.ft_dist_year;
    } else if (statusVal === 'missing_cert') {
      matchStatus = !s.certificacion;
    } else if (statusVal === 'cert_expiring') {
      if (!s.cert_fecha) {
        matchStatus = false;
      } else {
        const diffTime = new Date(s.cert_fecha) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchStatus = diffDays > 0 && diffDays <= 90;
      }
    }

    return matchSearch && matchType && matchFab && matchDist && matchHaccp && matchStatus;
  });

  renderTable(filtered);
}

function renderTable(suppliers) {
  resultsCount.textContent = `${suppliers.length} registros`;
  if (!suppliers.length) {
    supplierGrid.innerHTML = `<div class="empty-state"><i>🔍</i><p>No se encontraron materias primas con los filtros aplicados.</p></div>`;
    return;
  }

  let tableHtml = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Materia Prima / Insumo</th>
          <th>Categoría</th>
          <th>Fabricante</th>
          <th>Proveedor / Dist.</th>
          <th>FT Fab</th>
          <th>FT Int</th>
          <th>Acta San.</th>
          <th>HACCP</th>
          <th>Cert. Calidad</th>
          <th>Vence Cert.</th>
          <th>Alérgenos</th>
          <th>Apto Envase</th>
          <th>FQ</th>
          <th colspan="3">Cartas Firmadas<br><small style="font-size:10px;">Fraude | Spec | Otras</small></th>
        </tr>
      </thead>
      <tbody>
  `;

  suppliers.forEach(s => {
    const ftFabBadge = s.ft_year ? `<span class="badge badge-success">${s.ft_year}</span>` : '<span class="badge badge-danger">✗</span>';
    const ftIntBadge = s.ft_dist_year ? `<span class="badge badge-info">${s.ft_dist_year}</span>` : '<span class="badge badge-danger">✗</span>';
    const haccpClass = s.riesgo_haccp === 'Alto' ? 'badge-danger' : s.riesgo_haccp === 'Medio' ? 'badge-warning' : s.riesgo_haccp === 'Bajo' ? 'badge-success' : 'badge-neutral';
    
    let certBadge = '<span class="badge badge-danger">✗</span>';
    let vencimientoHtml = '—';
    if (s.certificacion) {
      certBadge = '<span class="badge badge-success">✓</span>';
      if (s.cert_fecha) {
        const diffTime = new Date(s.cert_fecha) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          vencimientoHtml = `<span class="badge badge-danger" title="Vencido">${s.cert_fecha}</span>`;
        } else if (diffDays <= 90) {
          vencimientoHtml = `<span class="badge badge-warning" title="Vence pronto">${s.cert_fecha}</span>`;
        } else {
          vencimientoHtml = `<span class="badge badge-success">${s.cert_fecha}</span>`;
        }
      }
    }

    tableHtml += `
      <tr class="table-row-interactive" data-name="${s.folder_name}">
        <td style="font-weight:600; color:var(--accent-color);">${s.codigo || '—'}</td>
        <td style="font-weight:700; max-width:240px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.material}">${s.material}</td>
        <td><span class="supplier-type ${getTypeClass(s.folder_type)}">${getTypeLabel(s.folder_type)}</span></td>
        <td class="text-secondary">${s.provider || '—'}</td>
        <td class="text-secondary">${s.distributor || '—'}</td>
        <td class="text-center">${ftFabBadge}</td>
        <td class="text-center">${ftIntBadge}</td>
        <td class="text-center">${s.acta_sanitaria ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-danger">✗</span>'}</td>
        <td class="text-center"><span class="badge ${haccpClass}">${s.riesgo_haccp || 'N/A'}</span></td>
        <td class="text-center">${certBadge}</td>
        <td class="text-center">${vencimientoHtml}</td>
        <td class="text-center">${s.decl_alergenos ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-danger">✗</span>'}</td>
        <td class="text-center">${s.decl_apto ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-neutral">N/A</span>'}</td>
        <td class="text-center">${s.analisis_fq ? '<span class="badge badge-success">✓</span>' : '<span class="badge badge-danger">✗</span>'}</td>
        <td class="text-center" style="border-right:none; padding-right:4px;">${s.carta_fraude ? '🟢' : '🔴'}</td>
        <td class="text-center" style="border-left:none; border-right:none; padding-left:4px; padding-right:4px;">${s.carta_especificacion ? '🟢' : '🔴'}</td>
        <td class="text-center" style="border-left:none; padding-left:4px;">${s.cartas_otras ? '🟢' : '🔴'}</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  supplierGrid.innerHTML = tableHtml;

  // Add click handlers
  supplierGrid.querySelectorAll('.table-row-interactive').forEach(tr => {
    tr.addEventListener('click', () => {
      const name = tr.getAttribute('data-name');
      const supplier = currentSuppliers.find(s => s.folder_name === name);
      if (supplier) openDrawer(supplier);
    });
  });
}

function getTypeClass(type) {
  if (appData && appData.config && appData.config.folder_types) {
    const idx = appData.config.folder_types.findIndex(t => t.name === type);
    if (idx >= 0) return TYPE_PALETTE[idx % TYPE_PALETTE.length];
  }
  return 'type-mp';
}

function getTypeLabel(type) {
  if (appData && appData.config && appData.config.folder_types) {
    const ft = appData.config.folder_types.find(t => t.name === type);
    if (ft) {
      const short = ft.name
        .replace(/^Proveedores\s+/i, '')
        .replace(/^Informacion\s+/i, '')
        .replace(/^Maquilas\s+/i, 'Maq. ');
      return short.length > 16 ? short.substring(0, 15) + '…' : short;
    }
  }
  return type;
}

// ============================================================
// POPULATE DROPDOWNS
// ============================================================
function populateFolderTypeDropdowns() {
  if (!appData || !appData.config || !appData.config.folder_types) return;
  const types = appData.config.folder_types;

  const prevFilter = filterType.value;
  const prevForm   = supplierFolderType.value;

  filterType.innerHTML = '<option value="all">Todas las Categorías</option>';
  types.forEach(t => {
    const o = document.createElement('option');
    o.value = t.name; o.textContent = t.name;
    filterType.appendChild(o);
  });
  if (prevFilter && filterType.querySelector(`option[value="${CSS.escape(prevFilter)}"]`))
    filterType.value = prevFilter;

  supplierFolderType.innerHTML = '';
  types.forEach(t => {
    const o = document.createElement('option');
    o.value = t.name; o.textContent = t.name;
    supplierFolderType.appendChild(o);
  });
  if (prevForm && supplierFolderType.querySelector(`option[value="${CSS.escape(prevForm)}"]`))
    supplierFolderType.value = prevForm;
}

function populateCatalogsDropdowns() {
  if (!appData || !appData.config) return;

  const fabEntities  = appData.config.fabricante_entities  || [];
  const distEntities = appData.config.distribuidor_entities || [];
  const fabs = fabEntities.length  ? fabEntities.map(e => e.name)  : (appData.config.fabricantes  || []);
  const dists = distEntities.length ? distEntities.map(e => e.name) : (appData.config.distribuidores || []);

  const populate = (el, items, placeholder) => {
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="all">${placeholder}</option>`;
    items.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; el.appendChild(o); });
    el.value = cur;
  };

  populate(filterFabricante,   fabs,  'Todos los Fabricantes');
  populate(filterDistribuidor, dists, 'Todos los Proveedores/Dist.');

  supplierProviderSelect.innerHTML = '<option value="">-- Seleccionar Fabricante --</option>';
  fabs.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; supplierProviderSelect.appendChild(o); });

  supplierDistributorSelect.innerHTML = '<option value="">-- Seleccionar Proveedor/Dist. --</option>';
  dists.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; supplierDistributorSelect.appendChild(o); });
}

// ============================================================
// DRAWER
// ============================================================
function openDrawer(supplier) {
  selectedSupplier = supplier;
  drawerTitle.textContent       = supplier.material;
  drawerMaterial.textContent  = supplier.material;
  drawerProvider.textContent  = supplier.provider || '—';
  drawerDistributor.textContent = supplier.distributor || '—';
  drawerCliente.textContent    = supplier.cliente || '—';
  drawerCodigo.textContent     = supplier.codigo || '—';
  drawerCategoria.textContent  = supplier.folder_type;
  drawerHaccp.textContent      = supplier.riesgo_haccp || 'N/A';
  drawerType.textContent      = getTypeLabel(supplier.folder_type);
  drawerType.className        = `supplier-type ${getTypeClass(supplier.folder_type)}`;
  
  if (drawerFileSearch) drawerFileSearch.value = '';
  
  renderDrawerDocStatus();
  renderFileList();
  renderRelatedSuppliers();
  
  drawerBackdrop.classList.add('active');
  drawer.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawerBackdrop.classList.remove('active');
  drawer.classList.remove('active');
  document.body.style.overflow = '';
}

function renderDrawerDocStatus() {
  if (!selectedSupplier) return;
  
  let statusHtml = '';
  
  const hasFT = selectedSupplier.files?.some(f => f.category === "Ficha Técnica (FT)") || selectedSupplier.ft_year || selectedSupplier.ft_dist_year;
  statusHtml += `
    <div class="doc-status-card ${hasFT ? 'active' : ''}">
      <span class="doc-status-icon">${hasFT ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Ficha Técnica (FT)</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">
          Fab: ${selectedSupplier.ft_year || 'No especificado'} | Dist: ${selectedSupplier.ft_dist_year || 'No especificado'}
        </div>
      </div>
    </div>
  `;

  statusHtml += `
    <div class="doc-status-card ${selectedSupplier.acta_sanitaria ? 'active' : ''}">
      <span class="doc-status-icon">${selectedSupplier.acta_sanitaria ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Acta Sanitaria</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">Chequeado y verificado en auditoría.</div>
      </div>
    </div>
  `;

  let dateText = selectedSupplier.cert_fecha ? `Vence: ${selectedSupplier.cert_fecha}` : 'Sin fecha vencimiento';
  statusHtml += `
    <div class="doc-status-card ${selectedSupplier.certificacion ? 'active' : ''}">
      <span class="doc-status-icon">${selectedSupplier.certificacion ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Certificación de Inocuidad</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">${dateText}</div>
      </div>
    </div>
  `;

  statusHtml += `
    <div class="doc-status-card ${selectedSupplier.decl_alergenos ? 'active' : ''}">
      <span class="doc-status-icon">${selectedSupplier.decl_alergenos ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Declaración de Alérgenos</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">Obligatorio para Materia Prima.</div>
      </div>
    </div>
  `;

  statusHtml += `
    <div class="doc-status-card ${selectedSupplier.decl_apto ? 'active' : ''}">
      <span class="doc-status-icon">${selectedSupplier.decl_apto ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Apto Contacto Alimentos</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">Obligatorio para envases y tapas.</div>
      </div>
    </div>
  `;

  statusHtml += `
    <div class="doc-status-card ${selectedSupplier.analisis_fq ? 'active' : ''}">
      <span class="doc-status-icon">${selectedSupplier.analisis_fq ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Análisis FQ</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">Reporte fisicoquímico de calidad.</div>
      </div>
    </div>
  `;

  const lettersCount = (selectedSupplier.carta_fraude ? 1 : 0) + (selectedSupplier.carta_especificacion ? 1 : 0) + (selectedSupplier.cartas_otras ? 1 : 0);
  statusHtml += `
    <div class="doc-status-card ${lettersCount === 3 ? 'active' : lettersCount > 0 ? 'warning' : ''}" style="grid-column: 1/-1;">
      <span class="doc-status-icon">${lettersCount > 0 ? '✓' : '✗'}</span>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">Cartas Firmadas (${lettersCount}/3)</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">
          Fraude: ${selectedSupplier.carta_fraude ? 'SI':'NO'} | Especificación: ${selectedSupplier.carta_especificacion ? 'SI':'NO'} | Otras: ${selectedSupplier.cartas_otras ? 'SI':'NO'}
        </div>
      </div>
    </div>
  `;

  drawerDocStatus.innerHTML = statusHtml;
}

function renderFileList() {
  drawerFileList.innerHTML = '';
  if (!selectedSupplier.files || !selectedSupplier.files.length) {
    drawerFileList.innerHTML = '<div class="empty-state" style="padding:20px;">No se encontraron archivos cargados.</div>';
    return;
  }
  const sorted = [...selectedSupplier.files].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    const fileUrl = `/api/file/view?path=${encodeURIComponent(file.relative_path)}`;
    const delBtn  = isServerMode
      ? `<button class="btn-danger btn-delete-file" style="padding:6px 10px;font-size:0.8rem;border-radius:4px;display:inline-flex;align-items:center;" title="Eliminar">🗑️</button>`
      : '';
    fileItem.innerHTML = `
      <div class="file-info">
        <span class="file-name" title="${file.name}">${file.name}</span>
        <div class="file-meta"><span>${file.size_mb} MB</span><span>•</span><span>Modificado: ${file.last_modified}</span></div>
        <div style="margin-top:4px;"><span class="file-category-badge">${file.category}</span></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <a href="${fileUrl}" class="btn-open-file" target="_blank" title="Abrir archivo localmente">Abrir</a>
        ${delBtn}
      </div>`;
    if (isServerMode) fileItem.querySelector('.btn-delete-file')?.addEventListener('click', () => handleDeleteFile(file));
    drawerFileList.appendChild(fileItem);
  });
}

function renderRelatedSuppliers() {
  if (!drawerRelatedList || !selectedSupplier) return;
  drawerRelatedList.innerHTML = '';
  const materialKey = (selectedSupplier.material || '').trim().toUpperCase();
  if (!materialKey) {
    drawerRelatedList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);padding:8px;">Sin material asignado.</div>';
    return;
  }
  const related = currentSuppliers.filter(s =>
    s.folder_name !== selectedSupplier.folder_name &&
    (s.material || '').trim().toUpperCase() === materialKey
  );
  if (!related.length) {
    drawerRelatedList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);padding:8px;">Este es el único registro para esta materia prima.</div>';
    return;
  }
  related.forEach(rel => {
    const item = document.createElement('div');
    item.className = 'related-supplier-item';
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => openDrawer(rel));
    item.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.85rem;">${rel.provider || 'Sin Fabricante'}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">Prov: ${rel.distributor || '—'} · Código: ${rel.codigo || '—'}</div>
      </div>
      <div class="score-number score-perfect" style="font-size:0.9rem;">${rel.riesgo_haccp || 'N/A'}</div>`;
    drawerRelatedList.appendChild(item);
  });
}

function filterDrawerFiles() {
  if (!drawerFileSearch) return;
  const q = drawerFileSearch.value.toLowerCase().trim();
  drawerFileList.querySelectorAll('.file-item').forEach(item => {
    const name = item.querySelector('.file-name')?.textContent?.toLowerCase() || '';
    const cat  = item.querySelector('.file-category-badge')?.textContent?.toLowerCase() || '';
    item.style.display = (!q || name.includes(q) || cat.includes(q)) ? '' : 'none';
  });
}

// ============================================================
// FILE DELETE
// ============================================================
async function handleDeleteFile(file) {
  if (!confirm(`¿Eliminar permanentemente "${file.name}" del disco?`)) return;
  try {
    const r = await fetch('/api/file/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relative_path: file.relative_path, folder_name: selectedSupplier.folder_name, folder_type: selectedSupplier.folder_type })
    });
    if (r.ok) {
      showToast('Archivo eliminado correctamente.');
      await fetchData();
      selectedSupplier = currentSuppliers.find(s => s.folder_name === selectedSupplier.folder_name);
      if (selectedSupplier) {
        renderFileList();
        renderDrawerDocStatus();
      }
    } else { showToast('Error al eliminar archivo.', 'danger'); }
  } catch (e) {
    console.error(e);
    showToast('Error de conexión: ' + e.message, 'danger');
  }
}

// ============================================================
// SUPPLIER FORM CRUD (Materias Primas)
// ============================================================
let isAutoNaming = false;

function autoGenerateFolderName() {
  if (!isAutoNaming) return;
  const mat  = supplierMaterialInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const prov = (providerInputMode === 'select' ? supplierProviderSelect.value : supplierProviderText.value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const dist = (distributorInputMode === 'select' ? supplierDistributorSelect.value : supplierDistributorText.value).trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  const parts = [mat, prov, dist].filter(p => p.length > 0);
  supplierNameInput.value = parts.join('_');
}

function openSupplierModal(supplier = null) {
  populateFolderTypeDropdowns();
  populateCatalogsDropdowns();
  toggleProviderInputMode('select');
  toggleDistributorInputMode('select');
  
  supplierProviderText.value = '';
  supplierDistributorText.value = '';
  supplierCertFechaInput.value = '';

  chkCertificacion.addEventListener('change', () => {
    certFechaGroup.style.display = chkCertificacion.checked ? 'block' : 'none';
  });

  if (supplier) {
    isAutoNaming = false;
    supplierModalTitle.textContent = '✏️ Editar Materia Prima / Insumo';
    supplierOldName.value       = supplier.folder_name;
    supplierNameInput.value     = supplier.folder_name;
    supplierFolderType.value    = supplier.folder_type;
    supplierMaterialInput.value = supplier.material;
    
    supplierCodigoInput.value     = supplier.codigo || '';
    supplierClienteInput.value    = supplier.cliente || '';
    supplierHaccpSelect.value     = supplier.riesgo_haccp || '';
    supplierFtYearInput.value     = supplier.ft_year || '';
    supplierFtDistYearInput.value = supplier.ft_dist_year || '';

    chkActaSanitaria.checked       = !!supplier.acta_sanitaria;
    chkCertificacion.checked        = !!supplier.certificacion;
    certFechaGroup.style.display   = supplier.certificacion ? 'block' : 'none';
    supplierCertFechaInput.value   = supplier.cert_fecha || '';
    chkDeclAlergenos.checked       = !!supplier.decl_alergenos;
    chkDeclApto.checked            = !!supplier.decl_apto;
    chkAnalisisFq.checked          = !!supplier.analisis_fq;
    chkCartaFraude.checked         = !!supplier.carta_fraude;
    chkCartaEspecificacion.checked = !!supplier.carta_especificacion;
    chkCartasOtras.checked         = !!supplier.cartas_otras;

    const fabs = (appData.config.fabricante_entities || []).map(e => e.name);
    if (fabs.includes(supplier.provider)) {
      supplierProviderSelect.value = supplier.provider;
    } else if (supplier.provider && supplier.provider !== 'N/A' && supplier.provider !== '—') {
      toggleProviderInputMode('text'); supplierProviderText.value = supplier.provider;
    } else { supplierProviderSelect.value = ''; }

    const dists = (appData.config.distribuidor_entities || []).map(e => e.name);
    if (dists.includes(supplier.distributor)) {
      supplierDistributorSelect.value = supplier.distributor;
    } else if (supplier.distributor && supplier.distributor !== 'N/A' && supplier.distributor !== '—') {
      toggleDistributorInputMode('text'); supplierDistributorText.value = supplier.distributor;
    } else { supplierDistributorSelect.value = ''; }
  } else {
    isAutoNaming = true;
    supplierModalTitle.textContent = '➕ Nuevo Registro';
    supplierOldName.value = '';
    supplierNameInput.value = '';
    const types = appData.config.folder_types || [];
    supplierFolderType.value = types.length ? types[0].name : '';
    supplierMaterialInput.value = '';
    supplierCodigoInput.value = '';
    supplierClienteInput.value = '';
    supplierHaccpSelect.value = '';
    supplierFtYearInput.value = '';
    supplierFtDistYearInput.value = '';

    chkActaSanitaria.checked       = false;
    chkCertificacion.checked        = false;
    certFechaGroup.style.display   = 'none';
    chkDeclAlergenos.checked       = false;
    chkDeclApto.checked            = false;
    chkAnalisisFq.checked          = false;
    chkCartaFraude.checked         = false;
    chkCartaEspecificacion.checked = false;
    chkCartasOtras.checked         = false;
    
    supplierProviderSelect.value = '';
    supplierDistributorSelect.value = '';
  }
  
  supplierModalBackdrop.classList.add('active');
}

function closeSupplierModal() { supplierModalBackdrop.classList.remove('active'); }

async function handleSaveSupplier() {
  const oldName = supplierOldName.value;
  let providerVal = providerInputMode === 'select' ? supplierProviderSelect.value.trim() : supplierProviderText.value.trim();
  if (!providerVal) providerVal = 'N/A';
  let distributorVal = distributorInputMode === 'select' ? supplierDistributorSelect.value.trim() : supplierDistributorText.value.trim();
  if (!distributorVal) distributorVal = 'N/A';

  const payload = {
    folder_name:  supplierNameInput.value.trim(),
    folder_type:  supplierFolderType.value,
    material:     supplierMaterialInput.value.trim(),
    provider:     providerVal,
    distributor:  distributorVal,
    
    codigo:        supplierCodigoInput.value.trim(),
    cliente:       supplierClienteInput.value.trim(),
    riesgo_haccp:  supplierHaccpSelect.value,
    ft_year:       supplierFtYearInput.value.trim(),
    ft_dist_year:  supplierFtDistYearInput.value.trim(),
    
    acta_sanitaria:       chkActaSanitaria.checked,
    certificacion:        chkCertificacion.checked,
    cert_fecha:           chkCertificacion.checked ? supplierCertFechaInput.value : '',
    decl_alergenos:       chkDeclAlergenos.checked,
    decl_apto:            chkDeclApto.checked,
    analisis_fq:          chkAnalisisFq.checked,
    carta_fraude:         chkCartaFraude.checked,
    carta_especificacion: chkCartaEspecificacion.checked,
    cartas_otras:         chkCartasOtras.checked
  };

  if (!payload.folder_name || !payload.material)
    return showToast('Complete al menos el nombre de la materia prima y carpeta.', 'danger');

  // Auto-add entity to config catalogs if new
  let configChanged = false;
  if (providerVal !== 'N/A' && providerVal !== '—') {
    const fabNames = (appData.config.fabricante_entities || []).map(e => e.name);
    if (!fabNames.includes(providerVal)) {
      appData.config.fabricante_entities.push({
        name: providerVal,
        folder_name: providerVal.replace(/[\\/:*?"<>|]/g, '_').toUpperCase()
      });
      configChanged = true;
    }
  }
  if (distributorVal !== 'N/A' && distributorVal !== '—') {
    const distNames = (appData.config.distribuidor_entities || []).map(e => e.name);
    if (!distNames.includes(distributorVal)) {
      appData.config.distribuidor_entities.push({
        name: distributorVal,
        folder_name: distributorVal.replace(/[\\/:*?"<>|]/g, '_').toUpperCase()
      });
      configChanged = true;
    }
  }
  if (configChanged && isServerMode) await saveConfigOnServer();

  const endpoint = oldName ? '/api/supplier/update' : '/api/supplier/create';
  if (oldName) payload.old_name = oldName;

  try {
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) {
      showToast(oldName ? 'Materia prima actualizada con éxito!' : 'Materia prima registrada con éxito!');
      closeSupplierModal(); closeDrawer(); await fetchData();
    } else { showToast('Error al guardar el registro.', 'danger'); }
  } catch (e) {
    console.error(e);
    showToast('Error de conexión: ' + e.message, 'danger');
  }
}

async function handleDeleteSupplier() {
  if (!isServerMode) return showToast('No permitido en modo estático', 'danger');
  if (!selectedSupplier) return;
  if (!confirm(`¿Eliminar permanentemente "${selectedSupplier.folder_name}"? Esta acción removerá el registro y su carpeta física.`)) return;
  try {
    const r = await fetch('/api/supplier/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_name: selectedSupplier.folder_name, folder_type: selectedSupplier.folder_type })
    });
    if (r.ok) { showToast('Registro eliminado con éxito.'); closeDrawer(); await fetchData(); }
    else { showToast('Error al eliminar.', 'danger'); }
  } catch (e) {
    console.error(e);
    showToast('Error de conexión: ' + e.message, 'danger');
  }
}

// ============================================================
// UPLOAD DOCUMENT
// ============================================================
function openUploadModal() {
  uploadFileInput.value = '';
  uploadFileNameDisplay.textContent = 'Haga clic o arrastre un archivo aquí';
  uploadFileBytes = null; uploadFileName = '';
  
  uploadModalBackdrop.classList.add('active');
}

function closeUploadModal() { uploadModalBackdrop.classList.remove('active'); }

function handleFileSelect(e) { if (e.target.files.length > 0) processFile(e.target.files[0]); }

function processFile(file) {
  uploadFileName = file.name;
  uploadFileNameDisplay.textContent = `${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)`;
  const reader = new FileReader();
  reader.onload = evt => { uploadFileBytes = evt.target.result.split(',')[1]; };
  reader.readAsDataURL(file);
}

async function handleUploadSubmit() {
  if (!selectedSupplier) return;
  if (!uploadFileBytes) return showToast('Por favor, seleccione un archivo.', 'danger');
  
  const payload = {
    file_name: uploadFileName,
    file_type: uploadDocType.value,
    file_data: uploadFileBytes,
    folder_name: selectedSupplier.folder_name,
    folder_type: selectedSupplier.folder_type
  };
  
  try {
    btnSubmitUpload.disabled = true; btnSubmitUpload.textContent = 'Subiendo...';
    const r = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    btnSubmitUpload.disabled = false; btnSubmitUpload.textContent = 'Subir y Vincular';
    if (r.ok) {
      showToast('Documento subido e indexado con éxito!'); closeUploadModal();
      await fetchData();
      const updated = currentSuppliers.find(s => s.folder_name === selectedSupplier.folder_name);
      if (updated) openDrawer(updated);
    } else { showToast('Error al cargar archivo.', 'danger'); }
  } catch (e) {
    btnSubmitUpload.disabled = false; btnSubmitUpload.textContent = 'Subir y Vincular';
    showToast('Error de conexión.', 'danger');
  }
}

// ============================================================
// CHECKLIST OF REQUIRED DOCUMENTS (Tab 3)
// ============================================================
function renderConfigChecklist() {
  configChecklistList.innerHTML = '';
  const activeCats = appData.config.checklist_categories || [];
  ALL_POSSIBLE_CATEGORIES.forEach(c => {
    const isActive = activeCats.some(ac => ac.category === c.category);
    const activeItem = activeCats.find(ac => ac.category === c.category);
    const shortVal = activeItem ? activeItem.short : c.short;
    const row = document.createElement('div');
    row.className = 'config-row';
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="checkbox" class="config-chk" data-category="${c.category}" ${isActive ? 'checked' : ''} style="transform:scale(1.25);cursor:pointer;">
        <span style="font-size:0.9rem;font-weight:500;">${c.desc}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:0.75rem;color:var(--text-secondary);">Abrev:</span>
        <input type="text" class="config-short" data-category="${c.category}" value="${shortVal}"
          style="width:70px;padding:4px 8px;font-size:0.8rem;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:4px;text-transform:uppercase;text-align:center;">
      </div>`;
    configChecklistList.appendChild(row);
  });
}

function filterConfigItems() {
  if (!configSearchInput) return;
  const q = configSearchInput.value.toLowerCase().trim();
  configChecklistList.querySelectorAll('.config-row').forEach(row => {
    row.style.display = (!q || row.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

async function handleSaveConfig() {
  const chks = configChecklistList.querySelectorAll('.config-chk');
  const selectedCats = [];
  chks.forEach(chk => {
    if (chk.checked) {
      const category = chk.getAttribute('data-category');
      const shortField = configChecklistList.querySelector(`.config-short[data-category="${category}"]`);
      const short = shortField ? shortField.value.trim().toUpperCase() : 'DOC';
      selectedCats.push({ category, short });
    }
  });
  if (!selectedCats.length) return showToast('Seleccione al menos una categoría.', 'danger');

  try {
    const r = await fetch('/api/config/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appData.config, checklist_categories: selectedCats })
    });
    if (r.ok) {
      showToast('Configuración del chequeo guardada con éxito.');
      await fetchData();
    } else { showToast('Error al guardar la configuración.', 'danger'); }
  } catch (e) {
    console.error(e);
    showToast('Error de conexión: ' + e.message, 'danger');
  }
}

// ============================================================
// CATALOG MANAGEMENT (Tab 2)
// ============================================================
function updateCatalogUI() {
  if (!catalogSelectType) return;
  const type = catalogSelectType.value;

  // Show/Hide role group and other inputs based on type
  const isFolder = type === 'folder_types';
  const isDistribuidor = type === 'distribuidor_entities';

  document.getElementById('catalog-nit-group').style.display = isFolder ? 'none' : 'block';
  document.getElementById('catalog-contact-group').style.display = isFolder ? 'none' : 'block';
  document.getElementById('catalog-cert-group').style.display = isFolder ? 'none' : 'block';
  document.getElementById('catalog-role-group').style.display = isDistribuidor ? 'block' : 'none';

  const infos = {
    folder_types: {
      label: 'Nombre de Carpeta Física (bajo GC-MP-PG11...)',
      info: '📁 Las categorías definen las carpetas principales donde se organizan las materias primas. Al crear una categoría se crea automáticamente el directorio en disco.',
      btn: '➕ Crear Categoría y Carpeta'
    },
    fabricante_entities: {
      label: 'Nombre de Carpeta del Fabricante (bajo /FABRICANTES/)',
      info: '🏭 Cada fabricante tiene su propia carpeta dentro de FABRICANTES/ donde puede guardar sus documentos, certificaciones y contratos.',
      btn: '➕ Crear Fabricante y Carpeta'
    },
    distribuidor_entities: {
      label: 'Nombre de Carpeta del Proveedor (bajo /DISTRIBUIDORES/)',
      info: '🚚 Cada distribuidor/proveedor tiene su propia carpeta dentro de DISTRIBUIDORES/ donde puede guardar sus documentos y contratos.',
      btn: '➕ Crear Proveedor y Carpeta'
    }
  };

  const info = infos[type] || infos.fabricante_entities;
  if (catalogFolderLabel) catalogFolderLabel.textContent = info.label;
  if (btnCatalogAddItem) {
    const isEdit = document.getElementById('catalog-edit-index').value !== "";
    btnCatalogAddItem.textContent  = isEdit ? '💾 Guardar Cambios' : info.btn;
  }
  if (catalogContextInfo) {
    catalogContextInfo.textContent = info.info;
  }
}

function filterCatalogItems() {
  if (!catalogSearchInput || !catalogItemsList) return;
  const q = catalogSearchInput.value.toLowerCase().trim();
  catalogItemsList.querySelectorAll('.catalog-item-row').forEach(row => {
    row.style.display = (!q || row.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
}

function renderCatalogItemsList() {
  if (!catalogItemsList) return;
  catalogItemsList.innerHTML = '';
  if (!appData) return;

  const type  = catalogSelectType ? catalogSelectType.value : 'fabricante_entities';
  const items = appData.config[type] || [];

  if (catalogCountBadge) catalogCountBadge.textContent = items.length;

  if (!items.length) {
    catalogItemsList.innerHTML = '<div style="font-size:0.9rem;color:var(--text-secondary);text-align:center;padding:30px;">Catálogo vacío. Agregue el primer elemento a la izquierda.</div>';
    return;
  }

  items.forEach((item, index) => {
    const name       = typeof item === 'object' ? item.name       : item;
    const folderName = typeof item === 'object' ? item.folder_name : null;
    const nit        = typeof item === 'object' ? item.nit        : '';
    const contact    = typeof item === 'object' ? item.contact    : '';
    const cert       = typeof item === 'object' ? item.cert       : '';
    const role       = typeof item === 'object' ? item.role       : '';

    let detailsHtml = '';
    if (type !== 'folder_types') {
      const parts = [];
      if (nit) parts.push(`<strong>NIT:</strong> ${nit}`);
      if (contact) parts.push(`<strong>Teléfono:</strong> ${contact}`);
      if (cert) parts.push(`<strong>Cert:</strong> ${cert}`);
      if (type === 'distribuidor_entities' && role) parts.push(`<strong>Rol:</strong> ${role}`);
      if (parts.length > 0) {
        detailsHtml = `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;line-height:1.4;">${parts.join(' · ')}</div>`;
      }
    }

    const row = document.createElement('div');
    row.className = 'catalog-item-row';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'stretch';
    row.style.gap = '8px';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="min-width:0; flex:1; padding-right:12px;">
          <div class="catalog-item-name" style="font-size:0.95rem; font-weight:700; color:var(--text-primary);" title="${name}">${name}</div>
          ${folderName ? `<div style="font-size:0.8rem;color:var(--accent-color);margin-top:2px;">📁 Carpeta física: ${folderName}</div>` : ''}
          ${detailsHtml}
        </div>
        <div class="catalog-item-actions" style="flex-shrink:0;">
          <button class="btn-secondary btn-edit-cat" style="padding:6px 12px;font-size:0.8rem;" title="Editar">✏️ Editar</button>
          <button class="btn-danger btn-del-cat" style="padding:6px 12px;font-size:0.8rem;background:var(--danger-color);" title="Eliminar">🗑️ Borrar</button>
        </div>
      </div>`;
    row.querySelector('.btn-edit-cat').addEventListener('click', () => handleEditCatalogItem(type, index));
    row.querySelector('.btn-del-cat').addEventListener('click',  () => handleDeleteCatalogItem(type, index));
    catalogItemsList.appendChild(row);
  });
}

function clearCatalogForm() {
  catalogNewItemInput.value = '';
  catalogNewFolderInput.value = '';
  document.getElementById('catalog-new-nit-input').value = '';
  document.getElementById('catalog-new-contact-input').value = '';
  document.getElementById('catalog-new-cert-input').value = '';
  document.getElementById('catalog-new-role-select').value = 'Ambos';
  
  document.getElementById('catalog-edit-index').value = '';
  document.getElementById('catalog-form-title').textContent = '➕ Registrar Nuevo Elemento';
  document.getElementById('btn-catalog-cancel-edit').style.display = 'none';
  
  updateCatalogUI();
}

async function handleCatalogAddItem() {
  const name = catalogNewItemInput.value.trim();
  if (!name) return showToast('El nombre no puede estar vacío.', 'danger');

  const type = catalogSelectType ? catalogSelectType.value : 'fabricante_entities';
  const rawFolder = catalogNewFolderInput ? catalogNewFolderInput.value.trim() : '';
  const folderName = rawFolder || name.replace(/[\\/:*?"<>|]/g, '_').toUpperCase().replace(/\s+/g, '_');
  
  const nit     = document.getElementById('catalog-new-nit-input').value.trim();
  const contact = document.getElementById('catalog-new-contact-input').value.trim();
  const cert    = document.getElementById('catalog-new-cert-input').value.trim();
  const role    = document.getElementById('catalog-new-role-select').value;

  const editIndexVal = document.getElementById('catalog-edit-index').value;
  const isEdit = editIndexVal !== "";

  if (!appData.config[type]) appData.config[type] = [];
  
  if (!isEdit) {
    const isDuplicate = (appData.config[type] || []).some(i => (typeof i === 'object' ? i.name : i) === name);
    if (isDuplicate) return showToast('Ya existe un elemento con ese nombre.', 'danger');
  }

  if (!isServerMode) {
    const dataObj = { name, folder_name: folderName, nit, contact, cert, role };
    if (isEdit) {
      appData.config[type][parseInt(editIndexVal)] = dataObj;
      showToast('Elemento modificado (modo lectura, no persistido).');
    } else {
      appData.config[type].push(dataObj);
      showToast('Elemento agregado (modo lectura, no persistido).');
    }
    clearCatalogForm();
    renderCatalogItemsList();
    return;
  }

  try {
    let endpoint, body;
    if (isEdit) {
      const oldItem = appData.config[type][parseInt(editIndexVal)];
      const oldName = typeof oldItem === 'object' ? oldItem.name : oldItem;
      const oldFolderName = typeof oldItem === 'object' ? oldItem.folder_name : oldName;
      
      if (type === 'folder_types') {
        endpoint = '/api/folder-type/update';
        body = { old_name: oldName, name, old_folder_name: oldFolderName, folder_name: folderName };
      } else {
        endpoint = '/api/entity/update';
        body = { entity_type: type, old_name: oldName, name, old_folder_name: oldFolderName, folder_name: folderName, nit, contact, cert, role };
      }
    } else {
      if (type === 'folder_types') {
        endpoint = '/api/folder-type/create';
        body = { name, folder_name: folderName };
      } else {
        endpoint = '/api/entity/create';
        body = { entity_type: type, name, folder_name: folderName, nit, contact, cert, role };
      }
    }

    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      showToast(isEdit ? `✅ "${name}" actualizado con éxito` : `✅ "${name}" registrado con éxito`);
      clearCatalogForm();
      await fetchData();
      switchWorkspaceTab('catalogos');
    } else {
      const err = await r.json().catch(() => ({}));
      showToast(`Error: ${err.message || 'No se pudo guardar.'}`, 'danger');
    }
  } catch (e) {
    console.error(e);
    showToast('Error de red: ' + e.message, 'danger');
  }
}

function handleEditCatalogItem(type, index) {
  const items = appData.config[type] || [];
  const item  = items[index];
  if (!item) return;

  // Set the form values for editing
  catalogNewItemInput.value = typeof item === 'object' ? item.name : item;
  catalogNewFolderInput.value = typeof item === 'object' ? item.folder_name : '';
  
  if (type !== 'folder_types') {
    document.getElementById('catalog-new-nit-input').value = item.nit || '';
    document.getElementById('catalog-new-contact-input').value = item.contact || '';
    document.getElementById('catalog-new-cert-input').value = item.cert || '';
    if (type === 'distribuidor_entities') {
      document.getElementById('catalog-new-role-select').value = item.role || 'Ambos';
    }
  }

  // Update UI headers to reflect editing mode
  document.getElementById('catalog-edit-index').value = index.toString();
  document.getElementById('catalog-form-title').textContent = '✏️ Editar Elemento';
  document.getElementById('btn-catalog-cancel-edit').style.display = 'block';
  
  updateCatalogUI();
  
  // Smooth scroll form into view for mobile viewports
  document.querySelector('.catalog-add-form').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteCatalogItem(type, index) {
  const items = appData.config[type] || [];
  const item  = items[index];
  if (!item) return;

  const name       = typeof item === 'object' ? item.name       : item;
  const folderName = typeof item === 'object' ? item.folder_name : null;

  if (!confirm(`¿Eliminar "${name}" del catálogo?`)) return;

  let deletePhysical = false;
  if (folderName && isServerMode) {
    deletePhysical = confirm(`¿Desea también ELIMINAR LA CARPETA FÍSICA?\n\n📁 "${folderName}"\n\n⚠️ Esto borrará permanentemente todos los archivos de esa carpeta.`);
  }

  if (!isServerMode) {
    items.splice(index, 1);
    appData.config[type] = items;
    showToast('Elemento eliminado.');
    renderCatalogItemsList(); return;
  }

  try {
    let endpoint, body;
    if (type === 'folder_types') {
      endpoint = '/api/folder-type/delete';
      body = { name, folder_name: folderName, delete_physical: deletePhysical };
    } else {
      endpoint = '/api/entity/delete';
      body = { entity_type: type, name, folder_name: folderName, delete_physical: deletePhysical };
    }
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      showToast(`✅ "${name}" eliminado.`);
      await fetchData();
      switchWorkspaceTab('catalogos');
    } else { showToast('Error al eliminar.', 'danger'); }
  } catch (e) {
    console.error(e);
    showToast('Error de red: ' + e.message, 'danger');
  }
}

// ============================================================
// SYNC EXCEL
// ============================================================
async function handleSyncExcel() {
  if (!isServerMode) return showToast('No permitido en modo estático', 'danger');
  try {
    btnSyncExcel.disabled = true; btnSyncExcel.textContent = 'Sincronizando...';
    showToast('Iniciando sincronización con Excel...');
    const r = await fetch('/api/sync', { method: 'POST' });
    btnSyncExcel.disabled = false; btnSyncExcel.textContent = '🔄 Sincronizar Excel';
    if (r.ok) showToast('Sincronización completada. El Excel ha sido actualizado.');
    else showToast('Error al ejecutar sincronización.', 'danger');
  } catch (e) {
    btnSyncExcel.disabled = false; btnSyncExcel.textContent = '🔄 Sincronizar Excel';
    showToast('Error de red al sincronizar.', 'danger');
  }
}

async function saveConfigOnServer() {
  try {
    const r = await fetch('/api/config/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appData.config)
    });
    if (!r.ok) throw new Error('Failed');
  } catch (e) { console.error('Error auto-saving config:', e); }
}

// ============================================================
// EVENT LISTENERS BINDING
// ============================================================
function setupEventListeners() {
  // Tabs events
  tabBtnPlanilla.addEventListener('click', () => switchWorkspaceTab('planilla'));
  tabBtnCatalogos.addEventListener('click', () => switchWorkspaceTab('catalogos'));
  tabBtnDocumentacion.addEventListener('click', () => switchWorkspaceTab('documentacion'));

  // Planilla Filters
  searchInput.addEventListener('input', applyFilters);
  filterType.addEventListener('change', applyFilters);
  filterFabricante.addEventListener('change', applyFilters);
  filterDistribuidor.addEventListener('change', applyFilters);
  filterHaccp.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);

  // Drawer
  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  btnNewSupplier.addEventListener('click', () => {
    if (!isServerMode) return showToast('No permitido en modo estático', 'danger');
    openSupplierModal(null);
  });
  btnEditSupplier.addEventListener('click', () => {
    if (!isServerMode) return showToast('No permitido en modo estático', 'danger');
    openSupplierModal(selectedSupplier);
  });
  btnDeleteSupplier.addEventListener('click', handleDeleteSupplier);
  btnSaveSupplier.addEventListener('click', handleSaveSupplier);
  btnCloseSupplierModal.addEventListener('click', closeSupplierModal);
  btnCancelSupplierModal.addEventListener('click', closeSupplierModal);

  btnSyncExcel.addEventListener('click', handleSyncExcel);

  // Upload
  btnUploadDoc.addEventListener('click', () => {
    if (!isServerMode) return showToast('No permitido en modo estático', 'danger');
    openUploadModal();
  });
  btnCloseUploadModal.addEventListener('click', closeUploadModal);
  btnCancelUploadModal.addEventListener('click', closeUploadModal);

  dropZone.addEventListener('click', () => uploadFileInput.click());
  uploadFileInput.addEventListener('change', handleFileSelect);
  btnSubmitUpload.addEventListener('click', handleUploadSubmit);

  // Modal Inputs Toggles
  supplierMaterialInput.addEventListener('input', autoGenerateFolderName);
  supplierProviderSelect.addEventListener('change', autoGenerateFolderName);
  supplierProviderText.addEventListener('input', autoGenerateFolderName);
  supplierDistributorSelect.addEventListener('change', autoGenerateFolderName);
  supplierDistributorText.addEventListener('input', autoGenerateFolderName);

  btnToggleProviderInput.addEventListener('click', () => toggleProviderInputMode());
  btnToggleDistributorInput.addEventListener('click', () => toggleDistributorInputMode());

  // Catalog tab events
  catalogSelectType.addEventListener('change', () => { updateCatalogUI(); renderCatalogItemsList(); });
  btnCatalogAddItem.addEventListener('click', handleCatalogAddItem);
  document.getElementById('btn-catalog-cancel-edit').addEventListener('click', clearCatalogForm);
  catalogSearchInput.addEventListener('input', filterCatalogItems);

  // Checklist tab events
  btnSaveConfig.addEventListener('click', handleSaveConfig);
  if (configSearchInput) configSearchInput.addEventListener('input', filterConfigItems);

  // General listeners
  if (drawerFileSearch) drawerFileSearch.addEventListener('input', filterDrawerFiles);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeDrawer(); closeSupplierModal(); closeUploadModal(); }
  });
}

function toggleProviderInputMode(forceMode = null) {
  providerInputMode = forceMode || (providerInputMode === 'select' ? 'text' : 'select');
  if (providerInputMode === 'select') {
    supplierProviderSelect.style.display = 'block';
    supplierProviderText.style.display   = 'none';
    btnToggleProviderInput.textContent   = '➕ Nuevo';
  } else {
    supplierProviderSelect.style.display = 'none';
    supplierProviderText.style.display   = 'block';
    btnToggleProviderInput.textContent   = '📋 Listado';
  }
}

function toggleDistributorInputMode(forceMode = null) {
  distributorInputMode = forceMode || (distributorInputMode === 'select' ? 'text' : 'select');
  if (distributorInputMode === 'select') {
    supplierDistributorSelect.style.display = 'block';
    supplierDistributorText.style.display   = 'none';
    btnToggleDistributorInput.textContent   = '➕ Nuevo';
  } else {
    supplierDistributorSelect.style.display = 'none';
    supplierDistributorText.style.display   = 'block';
    btnToggleDistributorInput.textContent   = '📋 Listado';
  }
}
