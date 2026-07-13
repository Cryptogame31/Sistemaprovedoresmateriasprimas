// ============================================================
// FIREBASE APP — Versión Firestore + Storage
// Reemplaza completamente a app.js
// ============================================================

// ── GLOBAL STATE ─────────────────────────────────────────────
let appData          = null;
let currentSuppliers = [];
let selectedSupplier = null;
let uploadFileBytes  = null;
let uploadFileName   = '';
let uploadFileObject = null; // File real para Firebase Storage
let activeWorkspaceTab = 'planilla';
let currentModalLotes = [];

const CHECKLIST_FIELDS = [
  { id: 'acta_sanitaria',       label: 'Acta Sanitaria',          short: 'ACTA'  },
  { id: 'certificacion',        label: 'Certificación ISO/FSSC',  short: 'CERT'  },
  { id: 'decl_alergenos',       label: 'Decl. Alérgenos',         short: 'ALERG' },
  { id: 'decl_apto',            label: 'Apto Alimentos',          short: 'APTO'  },
  { id: 'analisis_fq',          label: 'Análisis FQ',             short: 'FQ'    },
  { id: 'carta_fraude',         label: 'Carta Fraude',            short: 'FRAU'  },
  { id: 'carta_especificacion', label: 'Carta Especif.',          short: 'SPEC'  },
  { id: 'cartas_otras',         label: 'Otras Cartas',            short: 'OTRA'  }
];

const ALL_POSSIBLE_CATEGORIES = [
  { category: 'Ficha Técnica (FT)',             short: 'FT',    desc: 'Ficha Técnica' },
  { category: 'Certificado de Análisis (COA)',  short: 'COA',   desc: 'Certificado de Calidad (COA)' },
  { category: 'Hoja de Seguridad (MSDS)',       short: 'MSDS',  desc: 'Hoja de Seguridad (MSDS)' },
  { category: 'Acta Sanitaria',                 short: 'ACTA',  desc: 'Acta Sanitaria Interna' },
  { category: 'Certificación Proveedor',        short: 'CERT',  desc: 'Certificación del Proveedor' },
  { category: 'Declaración de Alérgenos',       short: 'ALERG', desc: 'Declaración de Alérgenos' },
  { category: 'Declaración Apto Alimentos',     short: 'APTO',  desc: 'Apto para Contacto con Alimentos' },
  { category: 'Análisis FQ',                    short: 'FQ',    desc: 'Análisis Fisicoquímico (FQ)' },
  { category: 'Carta Fraude',                   short: 'FRAU',  desc: 'Carta de Fraude' },
  { category: 'Carta Especificacion',           short: 'SPEC',  desc: 'Carta de Especificación' },
  { category: 'Otros Documentos',               short: 'OTRO',  desc: 'Otros Documentos' }
];

const DEFAULT_FOLDER_TYPES = [
  { name: 'Proveedores Materias Primas 2026', folder_name: 'MATERIAS PRIMAS_ PROVEEDORES 2026' },
  { name: 'Proveedores Materia Prima',         folder_name: 'MATERIA PRIMA' },
  { name: 'Proveedores Insumos',               folder_name: 'INSUMOS' },
  { name: 'Proveedores Servicios',             folder_name: 'SERVICIOS' },
  { name: 'Proveedores Alcoholicas',           folder_name: 'INFORMACION PROVEEDORES ALCOHOLICAS' },
  { name: 'Maquilas Clientes',                 folder_name: 'INFORMACION MAQUILAS CLIENTES' }
];

const TYPE_PALETTE = [
  'type-mp','type-alc','type-maq','type-insumo',
  'type-servicio','type-custom1','type-custom2','type-custom3','type-custom4'
];

// Firebase siempre disponible en esta versión
const isServerMode = true;

// ── DOM REFERENCES ───────────────────────────────────────────
const searchInput          = document.getElementById('search-input');
const filterType           = document.getElementById('filter-type');
const filterStatus         = document.getElementById('filter-status');
const filterFabricante     = document.getElementById('filter-fabricante');
const filterDistribuidor   = document.getElementById('filter-distribuidor');
const filterHaccp          = document.getElementById('filter-haccp');
const resultsCount         = document.getElementById('results-count');
const supplierGrid         = document.getElementById('supplier-grid');

const statTotalSuppliers  = document.getElementById('stat-total-suppliers');
const statTotalFiles      = document.getElementById('stat-total-files');
const statCompleteCount   = document.getElementById('stat-complete-count');
const statIncompleteCount = document.getElementById('stat-incomplete-count');
const statUniqueMaterials = document.getElementById('stat-unique-materials');
const lastUpdateText      = document.getElementById('last-update');

const tabBtnPlanilla      = document.getElementById('tab-btn-planilla');
const tabBtnCatalogos     = document.getElementById('tab-btn-catalogos');
const tabBtnDocumentacion = document.getElementById('tab-btn-documentacion');
const contentPlanilla     = document.getElementById('content-planilla');
const contentCatalogos    = document.getElementById('content-catalogos');
const contentDocumentacion= document.getElementById('content-documentacion');

const drawerBackdrop   = document.getElementById('drawer-backdrop');
const drawer           = document.getElementById('drawer');
const drawerTitle      = document.getElementById('drawer-title');
const drawerMaterial   = document.getElementById('drawer-material');
const drawerProvider   = document.getElementById('drawer-provider');
const drawerDistributor= document.getElementById('drawer-distributor');
const drawerCliente    = document.getElementById('drawer-cliente');
const drawerCodigo     = document.getElementById('drawer-codigo');
const drawerCategoria  = document.getElementById('drawer-categoria');
const drawerHaccp      = document.getElementById('drawer-haccp');
const drawerType       = document.getElementById('drawer-type');
const drawerDocStatus  = document.getElementById('drawer-doc-status');
const drawerFileList   = document.getElementById('drawer-file-list');
const drawerFileSearch = document.getElementById('drawer-file-search');
const drawerRelatedList= document.getElementById('drawer-related-list');
const btnCloseDrawer   = document.getElementById('btn-close-drawer');

const supplierModalBackdrop = document.getElementById('supplier-modal-backdrop');
const supplierModalTitle    = document.getElementById('supplier-modal-title');
const supplierOldName       = document.getElementById('supplier-old-name');
const supplierNameInput     = document.getElementById('supplier-name');
const supplierFolderType    = document.getElementById('supplier-folder-type');
const supplierMaterialInput = document.getElementById('supplier-material');
const supplierCodigoInput   = document.getElementById('supplier-codigo');
const supplierClienteInput  = null; // removed from HTML – handled by checklist
const supplierHaccpSelect   = document.getElementById('supplier-riesgo-haccp');
const supplierFtYearInput   = null; // removed from HTML
const supplierFtDistYearInput= null; // removed from HTML
const supplierCategoria = document.getElementById('supplier-categoria');

const DOC_FIELDS = {
  ft: { statusId: 'doc-status-ft', fileId: 'file-upload-ft', statusTextId: 'file-status-ft', category: 'Ficha Técnica (FT)', dbKey: 'doc_status_ft', linkId: 'doc-link-ft', linkDbKey: 'doc_link_ft' },
  ft_interna: { statusId: 'doc-status-ft-interna', fileId: 'file-upload-ft-interna', statusTextId: 'file-status-ft-interna', category: 'Ficha Técnica Interna', dbKey: 'doc_status_ft_interna', linkId: 'doc-link-ft-interna', linkDbKey: 'doc_link_ft_interna' },
  acta: { statusId: 'doc-status-acta', fileId: 'file-upload-acta', statusTextId: 'file-status-acta', category: 'Acta Sanitaria', dbKey: 'doc_status_acta', linkId: 'doc-link-acta', linkDbKey: 'doc_link_acta' },
  cert: { statusId: 'doc-status-cert-tipo', fileId: 'file-upload-cert', statusTextId: 'file-status-cert', category: 'Certificación Proveedor', dbKey: 'doc_status_cert_tipo', venceId: 'doc-status-cert-vence', venceDbKey: 'doc_status_cert_vence', linkId: 'doc-link-cert', linkDbKey: 'doc_link_cert' },
  alergenos: { statusId: 'doc-status-alergenos', fileId: 'file-upload-alergenos', statusTextId: 'file-status-alergenos', category: 'Declaración de Alérgenos', dbKey: 'doc_status_alergenos', linkId: 'doc-link-alergenos', linkDbKey: 'doc_link_alergenos' },
  apto: { statusId: 'doc-status-apto', fileId: 'file-upload-apto', statusTextId: 'file-status-apto', category: 'Declaración Apto Alimentos', dbKey: 'doc_status_apto', linkId: 'doc-link-apto', linkDbKey: 'doc_link_apto' },
  fq: { statusId: 'doc-status-fq', fileId: 'file-upload-fq', statusTextId: 'file-status-fq', category: 'Análisis FQ', dbKey: 'doc_status_fq', linkId: 'doc-link-fq', linkDbKey: 'doc_link_fq' },
  fraude: { statusId: 'doc-status-fraude', fileId: 'file-upload-fraude', statusTextId: 'file-status-fraude', category: 'Carta Fraude', dbKey: 'doc_status_fraude', linkId: 'doc-link-fraude', linkDbKey: 'doc_link_fraude' },
  especificacion: { statusId: 'doc-status-especificacion', fileId: 'file-upload-especificacion', statusTextId: 'file-status-especificacion', category: 'Carta Especificacion', dbKey: 'doc_status_especificacion', linkId: 'doc-link-especificacion', linkDbKey: 'doc_link_especificacion' },
  otras: { statusId: 'doc-status-otras', fileId: 'file-upload-otras', statusTextId: 'file-status-otras', category: 'Otros Documentos', dbKey: 'doc_status_otras', linkId: 'doc-link-otras', linkDbKey: 'doc_link_otras' }
};

let pendingFiles = {};
// Note: provider/distributor selects were removed from the form, replaced by checklist
const supplierProviderSelect    = null;
const supplierProviderText      = null;
const btnToggleProviderInput    = null;
const supplierDistributorSelect = null;
const supplierDistributorText   = null;
const btnToggleDistributorInput = null;
const btnSaveSupplier       = document.getElementById('btn-save-supplier');
const btnCloseSupplierModal = document.getElementById('btn-close-supplier-modal');
const btnCancelSupplierModal= document.getElementById('btn-cancel-supplier-modal');

const uploadModalBackdrop  = document.getElementById('upload-modal-backdrop');
const uploadDocType        = document.getElementById('upload-doc-type');
const uploadFileInput      = document.getElementById('upload-file-input');
const dropZone             = document.getElementById('drop-zone');
const uploadFileNameDisplay= document.getElementById('upload-file-name');
const btnSubmitUpload      = document.getElementById('btn-submit-upload');
const btnCloseUploadModal  = document.getElementById('btn-close-upload-modal');
const btnCancelUploadModal = document.getElementById('btn-cancel-upload-modal');

const configChecklistList  = document.getElementById('config-checklist-list');
const configSearchInput    = document.getElementById('config-search-input');
const btnSaveConfig        = document.getElementById('btn-save-config');

const catalogSelectType     = document.getElementById('catalog-select-type');
const catalogNewItemInput   = document.getElementById('catalog-new-item-input');
const catalogNewFolderInput = document.getElementById('catalog-new-folder-input');
const catalogFolderGroup    = document.getElementById('catalog-folder-group');
const catalogFolderLabel    = document.getElementById('catalog-folder-label');
const catalogContextInfo    = document.getElementById('catalog-context-info');
const btnCatalogAddItem     = document.getElementById('btn-catalog-add-item');
const catalogItemsList      = document.getElementById('catalog-items-list');
const catalogSearchInput    = document.getElementById('catalog-search-input');
const catalogCountBadge     = document.getElementById('catalog-count-badge');

const toastNotify    = document.getElementById('toast-notify');
const toastIcon      = document.getElementById('toast-icon');
const toastMessage   = document.getElementById('toast-message');
const btnNewSupplier = document.getElementById('btn-new-supplier');
const btnSyncExcel   = document.getElementById('btn-sync-excel');
const btnEditSupplier   = document.getElementById('btn-edit-supplier');
const btnDeleteSupplier = document.getElementById('btn-delete-supplier');
const btnUploadDoc      = document.getElementById('btn-upload-doc');

const tabBtnExcel = document.getElementById('tab-btn-excel');
const contentExcel = document.getElementById('content-excel');
const btnExportExcel = document.getElementById('btn-export-excel');
const excelFileInput = document.getElementById('excel-file-input');
const excelDropZone = document.getElementById('excel-drop-zone');
const excelFileName = document.getElementById('excel-file-name');
const btnSubmitExcelImport = document.getElementById('btn-submit-excel-import');
const btnReportSupplier = document.getElementById('btn-report-supplier');

const loginScreen = document.getElementById('login-screen');
const mainAppContainer = document.getElementById('main-app-container');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorMsg = document.getElementById('login-error-msg');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnLogout = document.getElementById('btn-logout');

let providerInputMode    = 'select';
let distributorInputMode = 'select';

let currentUser = null;

// ── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  
  // Listen to Firebase Auth state changes
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainAppContainer) mainAppContainer.style.display = 'block';
      fetchData();
    } else {
      currentUser = null;
      if (loginScreen) loginScreen.style.display = 'flex';
      if (mainAppContainer) mainAppContainer.style.display = 'none';
    }
  });
});

// ── TOAST ─────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  toastMessage.textContent = message;
  toastNotify.className = `toast active ${type}`;
  toastIcon.textContent = type === 'success' ? '✅' : type === 'danger' ? '❌' : '⚠️';
  setTimeout(() => toastNotify.classList.remove('active'), 4500);
}

// ── FETCH DATA (Firebase) ─────────────────────────────────────
async function fetchData() {
  try {
    supplierGrid.innerHTML = '<div class="empty-state"><i>🔄</i><p>Cargando desde Firebase...</p></div>';

    // 1. Cargar materias primas de Firestore
    const materialsSnap = await db.collection('materias_primas').get();
    const materialsData = {};
    materialsSnap.docs.forEach(doc => {
      const m = { _id: doc.id, ...doc.data() };
      const ft = m.folder_type || 'General';
      if (!materialsData[ft]) materialsData[ft] = [];
      materialsData[ft].push(m);
    });

    // 2. Cargar configuración de Firestore
    const configDoc = await db.collection('config').doc('app_config').get();
    const config    = configDoc.exists ? configDoc.data() : {};

    appData = {
      metadata: { scan_time: new Date().toLocaleString('es-CO') },
      data:     materialsData,
      config:   config
    };

    if (!appData.config)                       appData.config = {};
    if (!appData.config.checklist_categories)  appData.config.checklist_categories = ALL_POSSIBLE_CATEGORIES.slice(0, 3);
    if (!appData.config.folder_types || !appData.config.folder_types.length)
      appData.config.folder_types = DEFAULT_FOLDER_TYPES;
    if (!appData.config.entities) {
      const fabs = appData.config.fabricante_entities || [];
      const dists = appData.config.distribuidor_entities || [];
      const entitiesMap = {};
      fabs.forEach(f => {
        const name = typeof f === 'object' ? f.name : f;
        if (name) {
          entitiesMap[name] = {
            name: name,
            folder_name: f.folder_name || name.replace(/[\\/:*?\"<>|]/g, '_').toUpperCase().replace(/\s+/g, '_'),
            nit: f.nit || '',
            contact: f.contact || '',
            cert: f.cert || '',
            roles: { fabricante: true, proveedor: false, cliente: false }
          };
        }
      });
      dists.forEach(d => {
        const name = typeof d === 'object' ? d.name : d;
        if (name) {
          if (entitiesMap[name]) {
            entitiesMap[name].roles.proveedor = true;
          } else {
            entitiesMap[name] = {
              name: name,
              folder_name: d.folder_name || name.replace(/[\\/:*?\"<>|]/g, '_').toUpperCase().replace(/\s+/g, '_'),
              nit: d.nit || '',
              contact: d.contact || '',
              cert: d.cert || '',
              roles: { fabricante: false, proveedor: true, cliente: false }
            };
          }
        }
      });
      appData.config.entities = Object.values(entitiesMap);
      db.collection('config').doc('app_config').set(appData.config).catch(err => console.error("Error migrating entities:", err));
    }

    // 3. Construir lista plana con scores
    currentSuppliers = [];
    Object.keys(appData.data).forEach(category => {
      appData.data[category].forEach(supplier => {
        const hasFT   = supplier.files?.some(f => f.category === 'Ficha Técnica (FT)') || supplier.ft_year || supplier.ft_dist_year;
        const hasMSDS = supplier.files?.some(f => f.category === 'Hoja de Seguridad (MSDS)');
        const hasCOA  = supplier.files?.some(f => f.category === 'Certificado de Análisis (COA)');
        let score = 0;
        if (hasFT) score++; if (hasMSDS) score++; if (hasCOA) score++;
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
    console.error(err.stack || err);
    supplierGrid.innerHTML = `<div class="empty-state"><i style="color:#ef4444">⚠️</i><p>Error al cargar desde Firebase.<br><small>${err.message}</small></p></div>`;
  }
}

// ── SAVE CONFIG TO FIREBASE ───────────────────────────────────
async function saveConfigOnFirebase() {
  try {
    await db.collection('config').doc('app_config').set(appData.config);
  } catch (e) {
    console.error('Error guardando config:', e);
  }
}

// ── STATS ────────────────────────────────────────────────────
function updateStats() {
  if (!appData) return;
  statTotalSuppliers.textContent = currentSuppliers.length;
  statTotalFiles.textContent     = currentSuppliers.reduce((s, m) => s + (m.files?.length || 0), 0);
  lastUpdateText.textContent     = appData.metadata?.scan_time || '-';
  let complete = 0, incomplete = 0;
  const uniqueMaterials = new Set();
  currentSuppliers.forEach(s => {
    if (s.material) uniqueMaterials.add(s.material.trim().toUpperCase());
    if (s.completion_score === 3) complete++; else incomplete++;
  });
  statCompleteCount.textContent   = complete;
  statIncompleteCount.textContent = incomplete;
  statUniqueMaterials.textContent = uniqueMaterials.size;
}

// ── TABS ──────────────────────────────────────────────────────
function switchWorkspaceTab(tabId) {
  activeWorkspaceTab = tabId;
  tabBtnPlanilla.classList.toggle('active', tabId === 'planilla');
  tabBtnCatalogos.classList.toggle('active', tabId === 'catalogos');
  tabBtnDocumentacion.classList.toggle('active', tabId === 'documentacion');
  if (tabBtnExcel) tabBtnExcel.classList.toggle('active', tabId === 'excel');
  
  contentPlanilla.style.display      = tabId === 'planilla'      ? 'grid'  : 'none';
  contentCatalogos.style.display     = tabId === 'catalogos'     ? 'block' : 'none';
  contentDocumentacion.style.display = tabId === 'documentacion' ? 'block' : 'none';
  if (contentExcel) contentExcel.style.display = tabId === 'excel' ? 'block' : 'none';
  
  if (tabId === 'catalogos')    { updateCatalogUI(); renderCatalogItemsList(); }
  else if (tabId === 'documentacion') renderConfigChecklist();
}

// ── FILTERS & RENDER TABLE ────────────────────────────────────
function applyFilters() {
  if (!appData) return;
  const query    = searchInput.value.toLowerCase().trim();
  const typeVal  = filterType.value;
  const fabVal   = filterFabricante.value;
  const distVal  = filterDistribuidor.value;
  const haccpVal = filterHaccp.value;
  const statusVal= filterStatus.value;

  let filtered = currentSuppliers.filter(s => {
    const matchSearch = (s.codigo || '').toLowerCase().includes(query)
      || (s.material || '').toLowerCase().includes(query)
      || (s.provider || '').toLowerCase().includes(query)
      || (s.distributor || '').toLowerCase().includes(query)
      || (s.cliente || '').toLowerCase().includes(query);
    const matchType  = typeVal  === 'all' || s.folder_type  === typeVal;
    const matchFab   = fabVal   === 'all' || s.provider     === fabVal;
    const matchDist  = distVal  === 'all' || s.distributor  === distVal;
    const matchHaccp = haccpVal === 'all' || s.riesgo_haccp === haccpVal;
    let matchStatus = true;
    if (statusVal === 'complete')    matchStatus = s.completion_score === 3;
    else if (statusVal === 'pending') matchStatus = s.completion_score < 3;
    else if (statusVal === 'missing_ft')   matchStatus = !s.files?.some(f => f.category === 'Ficha Técnica (FT)') && !s.ft_year && !s.ft_dist_year;
    else if (statusVal === 'missing_cert') matchStatus = !s.certificacion;
    else if (statusVal === 'cert_expiring') {
      if (!s.cert_fecha) { matchStatus = false; }
      else { const d = Math.ceil((new Date(s.cert_fecha) - new Date()) / 86400000); matchStatus = d > 0 && d <= 90; }
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
      <thead><tr>
        <th>Código</th><th>Materia Prima / Insumo</th><th>Categoría</th>
        <th>Fabricante</th><th>Proveedor / Dist.</th>
        <th>FT Fab</th><th>FT Int</th><th>Acta San.</th><th>HACCP</th>
        <th>Cert. Calidad</th><th>Vence Cert.</th><th>Alérgenos</th>
        <th>Apto Envase</th><th>FQ</th>
        <th colspan="3">Cartas Firmadas<br><small style="font-size:10px;">Fraude | Spec | Otras</small></th>
      </tr></thead><tbody>`;

  function getStatusBadge(statusVal, linkVal = null, fallbackVal = null) {
    const val = (statusVal || fallbackVal || '').trim();
    if (!val) return '<span class="badge badge-danger">✗</span>';
    
    let valUrl = (linkVal || '').trim();
    if (!valUrl) {
      const urlMatch = val.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) valUrl = urlMatch[1];
    }
    const isUrl = !!valUrl;
    
    let displayVal = val;
    if (isUrl && !linkVal) {
      displayVal = val.replace(valUrl, '').replace(/\|/g, '').trim();
    }
    if (!displayVal) displayVal = 'Link';
    
    const valClean = displayVal.toLowerCase();
    
    let badgeHtml = '';
    if (valClean === 'si' || valClean === 'completo' || valClean === 'link') {
      badgeHtml = '<span class="badge badge-success">✓ Si</span>';
    } else if (valClean === 'no' || valClean === 'x') {
      badgeHtml = '<span class="badge badge-danger">✗ No</span>';
    } else if (valClean === 'na' || valClean === 'n/a' || valClean.includes('aplica')) {
      badgeHtml = '<span class="badge badge-neutral">N/A</span>';
    } else {
      const isCompleted = valClean === 'en carta' || /^\d{4}$/.test(valClean) || valClean.includes('vence') || valClean.includes('carta');
      badgeHtml = `<span class="badge ${isCompleted ? 'badge-success' : 'badge-warning'}">${displayVal}</span>`;
    }
    
    if (isUrl) {
      return `<a href="${valUrl}" target="_blank" style="text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="Abrir Enlace">${badgeHtml}<span style="font-size:0.72rem; filter:brightness(0.9);">🔗</span></a>`;
    }
    return badgeHtml;
  }

  function getCartaEmoji(val, linkVal = null, fallbackVal = null) {
    const status = (val || fallbackVal || '').trim();
    
    let valUrl = (linkVal || '').trim();
    if (!valUrl) {
      const urlMatch = status.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) valUrl = urlMatch[1];
    }
    const isUrl = !!valUrl;
    
    let cleanStatus = status;
    if (isUrl && !linkVal) {
      cleanStatus = status.replace(valUrl, '').replace(/\|/g, '').trim().toLowerCase();
    } else {
      cleanStatus = status.toLowerCase();
    }
    
    let emoji = '🟢';
    if (!cleanStatus || cleanStatus === 'no' || cleanStatus === 'x') {
      emoji = isUrl ? '🟢' : '🔴';
    } else if (cleanStatus === 'na' || cleanStatus === 'n/a' || cleanStatus.includes('aplica')) {
      emoji = '⚪';
    }
    
    if (isUrl) {
      return `<a href="${valUrl}" target="_blank" style="text-decoration:none; display:inline-flex; align-items:center; gap:2px;" title="Abrir Enlace">${emoji}<span style="font-size:0.75rem;">🔗</span></a>`;
    }
    return emoji;
  }

  suppliers.forEach(s => {
    const ftFabBadge = getStatusBadge(s.doc_status_ft, s.doc_link_ft, s.ft_year);
    const ftIntBadge = getStatusBadge(s.doc_status_ft_interna, s.doc_link_ft_interna, s.ft_dist_year);
    const haccpClass = s.riesgo_haccp === 'Alto' ? 'badge-danger' : s.riesgo_haccp === 'Medio' ? 'badge-warning' : s.riesgo_haccp === 'Bajo' ? 'badge-success' : 'badge-neutral';
    
    const certBadge = getStatusBadge(s.doc_status_cert_tipo, s.doc_link_cert, s.certificacion);
    
    let vencimientoHtml = '—';
    const vencVal = (s.doc_status_cert_vence || s.cert_fecha || '').trim();
    if (vencVal) {
      if (/^\d{4}$/.test(vencVal)) {
        vencimientoHtml = `<span class="badge badge-success">${vencVal}</span>`;
      } else if (!isNaN(Date.parse(vencVal))) {
        const d = Math.ceil((new Date(vencVal) - new Date()) / 86400000);
        vencimientoHtml = `<span class="badge ${d < 0 ? 'badge-danger' : d <= 90 ? 'badge-warning' : 'badge-success'}">${vencVal}</span>`;
      } else {
        vencimientoHtml = `<span class="badge badge-neutral">${vencVal}</span>`;
      }
    }

    tableHtml += `
      <tr class="table-row-interactive" data-name="${s.folder_name}">
        <td style="font-weight:600;color:var(--accent-color);">${s.codigo || '—'}</td>
        <td style="font-weight:700;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${s.material}">${s.material}</td>
        <td><span class="supplier-type ${getTypeClass(s.folder_type)}">${getTypeLabel(s.folder_type)}</span></td>
        <td class="text-secondary">${s.provider || '—'}</td>
        <td class="text-secondary">${s.distributor || '—'}</td>
        <td class="text-center">${ftFabBadge}</td>
        <td class="text-center">${ftIntBadge}</td>
        <td class="text-center">${getStatusBadge(s.doc_status_acta, s.doc_link_acta, s.acta_sanitaria)}</td>
        <td class="text-center"><span class="badge ${haccpClass}">${s.riesgo_haccp || 'N/A'}</span></td>
        <td class="text-center">${certBadge}</td>
        <td class="text-center">${vencimientoHtml}</td>
        <td class="text-center">${getStatusBadge(s.doc_status_alergenos, s.doc_link_alergenos, s.decl_alergenos)}</td>
        <td class="text-center">${getStatusBadge(s.doc_status_apto, s.doc_link_apto, s.decl_apto)}</td>
        <td class="text-center">${getStatusBadge(s.doc_status_fq, s.doc_link_fq, s.analisis_fq)}</td>
        <td class="text-center" style="border-right:none;padding-right:4px;">${getCartaEmoji(s.doc_status_fraude, s.doc_link_fraude, s.carta_fraude)}</td>
        <td class="text-center" style="border-left:none;border-right:none;padding:4px;">${getCartaEmoji(s.doc_status_especificacion, s.doc_link_especificacion, s.carta_especificacion)}</td>
        <td class="text-center" style="border-left:none;padding-left:4px;">${getCartaEmoji(s.doc_status_otras, s.doc_link_otras, s.cartas_otras)}</td>
      </tr>`;
  });
  tableHtml += '</tbody></table>';
  supplierGrid.innerHTML = tableHtml;
  supplierGrid.querySelectorAll('.table-row-interactive').forEach(tr => {
    tr.addEventListener('click', () => {
      const name = tr.getAttribute('data-name');
      const supplier = currentSuppliers.find(s => s.folder_name === name);
      if (supplier) openDrawer(supplier);
    });
  });
}

function getTypeClass(type) {
  if (appData?.config?.folder_types) {
    const idx = appData.config.folder_types.findIndex(t => t.name === type);
    if (idx >= 0) return TYPE_PALETTE[idx % TYPE_PALETTE.length];
  }
  return 'type-mp';
}

function getTypeLabel(type) {
  if (appData?.config?.folder_types) {
    const ft = appData.config.folder_types.find(t => t.name === type);
    if (ft) {
      const short = ft.name.replace(/^Proveedores\s+/i,'').replace(/^Informacion\s+/i,'').replace(/^Maquilas\s+/i,'Maq. ');
      return short.length > 16 ? short.substring(0, 15) + '…' : short;
    }
  }
  return type;
}

// ── POPULATE DROPDOWNS ────────────────────────────────────────
function populateFolderTypeDropdowns() {
  if (!appData?.config?.folder_types) return;
  const types = appData.config.folder_types;
  const prevFilter = filterType.value;
  const prevForm   = supplierFolderType.value;
  filterType.innerHTML = '<option value="all">Todas las Categorías</option>';
  types.forEach(t => { const o = document.createElement('option'); o.value = t.name; o.textContent = t.name; filterType.appendChild(o); });
  if (prevFilter) filterType.value = prevFilter;
  supplierFolderType.innerHTML = '';
  types.forEach(t => { const o = document.createElement('option'); o.value = t.name; o.textContent = t.name; supplierFolderType.appendChild(o); });
  if (prevForm) supplierFolderType.value = prevForm;
}

function populateCatalogsDropdowns() {
  if (!appData?.config) return;
  const entities = appData.config.entities || [];
  
  const fabs = entities.filter(e => e.roles && e.roles.fabricante).map(e => e.name).sort();
  const dists = entities.filter(e => e.roles && e.roles.proveedor).map(e => e.name).sort();
  
  const populate = (el, items, placeholder) => {
    if (!el) return;
    const cur = el.value;
    el.innerHTML = `<option value="all">${placeholder}</option>`;
    items.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; el.appendChild(o); });
    el.value = cur;
  };
  populate(filterFabricante, fabs, 'Todos los Fabricantes');
  populate(filterDistribuidor, dists, 'Todos los Proveedores/Dist.');
  
  if (supplierProviderSelect) {
    supplierProviderSelect.innerHTML = '<option value="">-- Seleccionar Fabricante --</option>';
    fabs.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; supplierProviderSelect.appendChild(o); });
  }
  if (supplierDistributorSelect) {
    supplierDistributorSelect.innerHTML = '<option value="">-- Seleccionar Proveedor/Dist. --</option>';
    dists.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; supplierDistributorSelect.appendChild(o); });
  }
}

// ── DRAWER ────────────────────────────────────────────────────
function formatEntityListWithLinks(namesStr, roleName) {
  const names = (namesStr || '').split(',').map(n => n.trim()).filter(Boolean);
  if (!names.length) return '—';
  
  return names.map(name => {
    const entities = appData?.config?.entities || [];
    const ent = entities.find(e => e.name.toLowerCase() === name.toLowerCase());
    
    if (ent) {
      let certLinksHtml = '';
      if (ent.cert_links) {
        const urls = ent.cert_links.split(',').map(u => u.trim()).filter(Boolean);
        urls.forEach((url, i) => {
          certLinksHtml += `<a href="${url}" target="_blank" style="margin-top:4px; font-size:0.72rem; color:var(--accent-color); text-decoration:none; font-weight:600; background:rgba(6,182,212,0.1); padding:2px 6px; border-radius:3px; display:inline-flex; align-items:center; gap:2px;">📜 Certificado ${urls.length > 1 ? (i + 1) : ''}</a>`;
        });
      }
      
      const nitInfo = ent.nit ? `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left:6px;">(NIT: ${ent.nit})</span>` : '';
      
      return `
        <div style="margin-bottom:8px;">
          <div style="font-weight:600; color:var(--text-primary); display:flex; align-items:center; flex-wrap:wrap;">
            <span>${ent.name}</span>
            ${nitInfo}
          </div>
          ${certLinksHtml ? `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;">${certLinksHtml}</div>` : ''}
        </div>`;
    }
    
    return `<div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${name}</div>`;
  }).join('');
}

function renderDrawerLotes(query = '') {
  const drawerLotesList = document.getElementById('drawer-lotes-list');
  if (!drawerLotesList || !selectedSupplier) return;
  drawerLotesList.innerHTML = '';
  
  let lotes = selectedSupplier.lotes_certificados || [];
  
  // Sort descending by date (fecha) by default
  lotes = [...lotes].sort((a, b) => {
    const fA = a.fecha || '';
    const fB = b.fecha || '';
    return fB.localeCompare(fA);
  });
  
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    lotes = lotes.filter(l => (l.lote || '').toLowerCase().includes(q) || (l.fecha || '').toLowerCase().includes(q));
  }
  
  if (!lotes.length) {
    drawerLotesList.innerHTML = `<div style="font-size:0.85rem; color:var(--text-secondary); text-align:center; padding:10px;">${query.trim() ? 'No se encontraron lotes para la búsqueda.' : 'Sin certificados por lote registrados.'}</div>`;
  } else {
    lotes.forEach(l => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);';
      const dateStr = l.fecha ? `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left:6px;">(${l.fecha})</span>` : '';
      row.innerHTML = `
        <div style="font-size:0.88rem; color:var(--text-primary);">
          📦 Lote: <strong>${l.lote}</strong> ${dateStr}
        </div>
        <a href="${l.link}" target="_blank" class="btn-primary" style="padding:4px 10px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
          🔗 Abrir Certificado
        </a>`;
      drawerLotesList.appendChild(row);
    });
  }
}

function openDrawer(supplier) {
  try {
    selectedSupplier = supplier;
    if (drawerTitle) drawerTitle.textContent     = supplier.material;
    if (drawerMaterial) drawerMaterial.textContent  = supplier.material;
    if (drawerProvider) drawerProvider.innerHTML  = formatEntityListWithLinks(supplier.provider, 'fabricante');
    if (drawerDistributor) drawerDistributor.innerHTML = formatEntityListWithLinks(supplier.distributor, 'proveedor');
    if (drawerCliente) drawerCliente.innerHTML   = formatEntityListWithLinks(supplier.cliente, 'cliente');
    if (drawerCodigo) drawerCodigo.textContent    = supplier.codigo     || '—';
    if (drawerCategoria) drawerCategoria.textContent = supplier.folder_type;
    if (document.getElementById('drawer-excel-categoria')) {
      document.getElementById('drawer-excel-categoria').textContent = supplier.categoria || '—';
    }
    if (drawerHaccp) drawerHaccp.textContent     = supplier.riesgo_haccp || 'N/A';
    if (drawerType) {
      drawerType.textContent      = getTypeLabel(supplier.folder_type);
      drawerType.className        = `supplier-type ${getTypeClass(supplier.folder_type)}`;
    }
    if (drawerFileSearch) drawerFileSearch.value = '';
    
    const lotesSearch = document.getElementById('drawer-lotes-search');
    if (lotesSearch) lotesSearch.value = '';
    renderDrawerLotes();

    renderDrawerDocStatus();
    renderFileList();
    renderRelatedSuppliers();
    
    // Defer visual transition to avoid layout thrashing and paint lag
    setTimeout(() => {
      if (drawerBackdrop) drawerBackdrop.classList.add('active');
      if (drawer) drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }, 50);
  } catch(e) {
    console.error('openDrawer error:', e);
  }
}

function closeDrawer() {
  drawerBackdrop.classList.remove('active');
  drawer.classList.remove('active');
  document.body.style.overflow = '';
}

function renderDrawerDocStatus() {
  if (!selectedSupplier) return;
  let html = '';
  const s = selectedSupplier;
  
  const items = [
    { label: 'Ficha Técnica (FT) Fabricante', status: s.doc_status_ft, link: s.doc_link_ft, category: 'Ficha Técnica (FT)' },
    { label: 'Ficha Técnica Interna', status: s.doc_status_ft_interna, link: s.doc_link_ft_interna, category: 'Ficha Técnica Interna' },
    { label: 'Acta Sanitaria (Año Visita)', status: s.doc_status_acta, link: s.doc_link_acta, category: 'Acta Sanitaria' },
    { label: 'Certificación SGC Proveedor', status: (s.doc_status_cert_tipo ? `${s.doc_status_cert_tipo} ${s.doc_status_cert_vence ? '(Vence: ' + s.doc_status_cert_vence + ')' : ''}` : null), link: s.doc_link_cert, category: 'Certificación Proveedor' },
    { label: 'Decl. Alérgenos (Materia Prima)', status: s.doc_status_alergenos, link: s.doc_link_alergenos, category: 'Declaración de Alérgenos' },
    { label: 'Apto Alimentos (Envase/Tapa)', status: s.doc_status_apto, link: s.doc_link_apto, category: 'Declaración Apto Alimentos' },
    { label: 'Análisis FQ (Metales/Pest.)', status: s.doc_status_fq, link: s.doc_link_fq, category: 'Análisis FQ' },
    { label: 'Carta Firmada: Fraude', status: s.doc_status_fraude, link: s.doc_link_fraude, category: 'Carta Fraude' },
    { label: 'Carta Firmada: Especificación', status: s.doc_status_especificacion, link: s.doc_link_especificacion, category: 'Carta Especificacion' },
    { label: 'Carta Firmada: Otras', status: s.doc_status_otras, link: s.doc_link_otras, category: 'Otros Documentos' }
  ];
  
  items.forEach(item => {
    const valText = item.status || 'No';
    const valClean = valText.trim();
    
    // Detect URL from dedicated field, or fallback to status text regex
    let valUrl = item.link ? item.link.trim() : null;
    if (!valUrl) {
      const urlMatch = valClean.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) valUrl = urlMatch[1];
    }
    const isUrl = !!valUrl;
    
    let displayVal = valClean;
    if (isUrl && !item.link) {
      displayVal = valClean.replace(valUrl, '').replace(/\|/g, '').trim();
    }
    if (!displayVal || (displayVal.toLowerCase() === 'no' && isUrl)) displayVal = 'Enlace Adjunto';

    const valCleanLower = displayVal.toLowerCase();
    const isCompleted = isUrl || valCleanLower === 'si' || valCleanLower === 'en carta' || /^\d{4}$/.test(valCleanLower) || valCleanLower.includes('vence') || valCleanLower.includes('completo') || valCleanLower.includes('aplica') || valCleanLower.includes('carta');
    const isPending = !isUrl && (!item.status || valCleanLower === 'no' || valCleanLower === 'x' || valCleanLower === '');
    const cardClass = isCompleted ? 'active' : isPending ? '' : 'warning';
    const icon = isCompleted ? '✓' : '✗';
    
    // Find file associated with this category
    const file = s.files?.find(f => f.category === item.category);
    let fileLinkHtml = '';
    
    if (isUrl) {
      fileLinkHtml = `<br><a href="${valUrl}" target="_blank" style="margin-top:6px; display:inline-block; font-size:0.75rem; color:var(--accent-color); text-decoration:none; font-weight:600; background:rgba(6,182,212,0.1); padding:3px 8px; border-radius:4px;">🔗 Abrir Enlace (Drive/Otro)</a>`;
    }
    
    if (file) {
      const url = file.firebase_url || (window.location.hostname === 'localhost' && file.relative_path ? `/api/file/view?path=${encodeURIComponent(file.relative_path)}` : null);
      if (url) {
        fileLinkHtml += `${fileLinkHtml ? ' ' : '<br>'}<a href="${url}" target="_blank" style="margin-top:6px; display:inline-block; font-size:0.75rem; color:var(--accent-color); text-decoration:none; font-weight:600; background:rgba(6,182,212,0.1); padding:3px 8px; border-radius:4px;">📄 Abrir Documento</a>`;
      }
    }
    
    html += `
      <div class="doc-status-card ${cardClass}" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:12px; height:auto; min-height:85px; border-left:4px solid ${isCompleted ? 'var(--success-color)' : isPending ? 'var(--danger-color)' : 'var(--warning-color)'};">
        <div style="display:flex; align-items:center; gap:8px; width:100%;">
          <span class="doc-status-icon" style="margin:0; width:18px; height:18px; font-size:0.75rem;">${icon}</span>
          <div style="font-weight:600; font-size:0.82rem; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.label}">${item.label}</div>
        </div>
        <div style="font-size:0.78rem; color:var(--text-secondary); margin-left:26px; line-height:1.2; width:calc(100% - 26px); word-break:break-word;">
          Estado: <strong>${displayVal}</strong>
          ${fileLinkHtml}
        </div>
      </div>`;
  });
  drawerDocStatus.innerHTML = html;
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
    // Firebase URL primero; si no existe y estamos en localhost, usar servidor local
    const fileUrl = file.firebase_url
      ? file.firebase_url
      : (window.location.hostname === 'localhost' && file.relative_path
          ? `/api/file/view?path=${encodeURIComponent(file.relative_path)}`
          : null);
    const openBtn = fileUrl
      ? `<a href="${fileUrl}" class="btn-open-file" target="_blank" title="Abrir archivo">Abrir</a>`
      : `<span style="font-size:0.75rem;color:var(--text-secondary);">Solo local</span>`;
    fileItem.innerHTML = `
      <div class="file-info">
        <span class="file-name" title="${file.name}">${file.name}</span>
        <div class="file-meta"><span>${file.size_mb} MB</span><span>•</span><span>${file.last_modified}</span></div>
        <div style="margin-top:4px;"><span class="file-category-badge">${file.category}</span></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        ${openBtn}
        <button class="btn-danger btn-delete-file" style="padding:6px 10px;font-size:0.8rem;border-radius:4px;" title="Eliminar">🗑️</button>
      </div>`;
    fileItem.querySelector('.btn-delete-file').addEventListener('click', () => handleDeleteFile(file));
    drawerFileList.appendChild(fileItem);
  });
}

function renderRelatedSuppliers() {
  if (!drawerRelatedList || !selectedSupplier) return;
  drawerRelatedList.innerHTML = '';
  const key = (selectedSupplier.material || '').trim().toUpperCase();
  const related = currentSuppliers.filter(s => s.folder_name !== selectedSupplier.folder_name && (s.material || '').trim().toUpperCase() === key);
  if (!related.length) { drawerRelatedList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);padding:8px;">Único registro para esta materia prima.</div>'; return; }
  related.forEach(rel => {
    const item = document.createElement('div');
    item.className = 'related-supplier-item';
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => openDrawer(rel));
    item.innerHTML = `<div style="flex:1;"><div style="font-weight:600;font-size:0.85rem;">${rel.provider || 'Sin Fabricante'}</div><div style="font-size:0.75rem;color:var(--text-secondary);">Prov: ${rel.distributor || '—'} · Código: ${rel.codigo || '—'}</div></div><div class="score-number score-perfect" style="font-size:0.9rem;">${rel.riesgo_haccp || 'N/A'}</div>`;
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

// ── FILE DELETE (Firebase Storage + Firestore) ────────────────
async function handleDeleteFile(file) {
  if (!confirm(`¿Eliminar permanentemente "${file?.name || 'este archivo'}"?`)) return;
  try {
    // Eliminar de Firebase Storage si tiene firebase_path
    if (file && typeof file.firebase_path === 'string' && file.firebase_path.trim() !== '' && file.firebase_path !== 'undefined' && file.firebase_path !== 'null') {
      await storage.ref(file.firebase_path).delete().catch(() => {});
    }
    showToast('Archivo eliminado correctamente.');
    if (selectedSupplier && selectedSupplier._id) {
      const remaining = (selectedSupplier.files || []).filter(f => f.name !== file.name || f.last_modified !== file.last_modified);
      await db.collection('materias_primas').doc(selectedSupplier._id).update({ files: remaining, files_count: remaining.length });
      selectedSupplier.files = remaining;
    }
    showToast('Archivo eliminado correctamente.');
    renderFileList();
    renderDrawerDocStatus();
    await fetchData();
  } catch (e) {
    console.error(e);
    showToast('Error al eliminar: ' + e.message, 'danger');
  }
}

// ── SUPPLIER FORM ─────────────────────────────────────────────
let isAutoNaming = false;

function autoGenerateFolderName() {
  if (!isAutoNaming) return;
  const mat  = (supplierMaterialInput?.value || '').trim().toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_');
  const provs = Array.from(document.querySelectorAll('.fabricante-select-chk:checked')).map(c => (c.value || '').trim().toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_'));
  const dists = Array.from(document.querySelectorAll('.proveedor-select-chk:checked')).map(c => (c.value || '').trim().toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_'));
  const allNames = [mat, ...provs, ...dists].filter(p => p.length > 0).join('_');
  if (supplierNameInput) supplierNameInput.value = allNames.slice(0, 100);
}

function populateChecklistCatalog(containerId, roleName, selectedString = '') {
  const container = document.getElementById(containerId);
  if (!container || !appData?.config) return;
  
  container.innerHTML = '';
  const entities = appData.config.entities || [];
  const filtered = entities.filter(e => e.roles && e.roles[roleName]).sort((a, b) => a.name.localeCompare(b.name));
  
  const selectedList = selectedString.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem;color:var(--text-secondary);padding:10px;">Ninguna entidad registrada con este rol.</div>';
    return;
  }
  
  filtered.forEach((ent, idx) => {
    const isChecked = selectedList.includes(ent.name.toLowerCase().trim());
    const label = document.createElement('label');
    label.style.cssText = 'display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.82rem; color:var(--text-primary); margin: 2px 0;';
    label.innerHTML = `
      <input type="checkbox" class="${roleName}-select-chk" value="${ent.name}" ${isChecked ? 'checked' : ''} style="cursor:pointer; transform:scale(1.15);">
      <span>${ent.name}</span>
    `;
    container.appendChild(label);
  });
}

async function handleQuickAddEntity(inputId, containerId, roleName) {
  const inputEl = document.getElementById(inputId);
  const name = inputEl ? inputEl.value.trim() : '';
  if (!name) return showToast('Ingrese un nombre para agregar.', 'danger');
  
  if (!appData.config.entities) appData.config.entities = [];
  const entities = appData.config.entities;
  const existingIdx = entities.findIndex(e => e.name.toLowerCase().trim() === name.toLowerCase().trim());
  
  let configChanged = false;
  if (existingIdx !== -1) {
    if (!entities[existingIdx].roles) entities[existingIdx].roles = {};
    if (!entities[existingIdx].roles[roleName]) {
      entities[existingIdx].roles[roleName] = true;
      configChanged = true;
    }
  } else {
    const newEnt = {
      name: name,
      folder_name: name.toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_'),
      nit: '', contact: '', cert: '',
      roles: { fabricante: false, proveedor: false, cliente: false }
    };
    newEnt.roles[roleName] = true;
    entities.push(newEnt);
    configChanged = true;
  }
  
  if (configChanged) {
    appData.config.entities = entities;
    await saveConfigOnFirebase();
    populateCatalogsDropdowns();
  }
  
  // Get currently checked values
  const currentChecked = Array.from(document.querySelectorAll(`.${roleName}-select-chk:checked`)).map(c => c.value);
  if (!currentChecked.includes(name)) {
    currentChecked.push(name);
  }
  
  populateChecklistCatalog(containerId, roleName, currentChecked.join(', '));
  if (inputEl) inputEl.value = '';
  showToast(`✅ "${name}" registrado y agregado.`);
}

function renderModalLotes() {
  const modalLotesList = document.getElementById('modal-lotes-list');
  if (!modalLotesList) return;
  modalLotesList.innerHTML = '';
  
  if (!currentModalLotes || !currentModalLotes.length) {
    modalLotesList.innerHTML = '<div style="font-size:0.8rem; color:var(--text-secondary); text-align:center; padding:10px;">No hay certificados por lote agregados.</div>';
    return;
  }
  
  // Sort descending by date (fecha)
  const sortedLotes = [...currentModalLotes].sort((a, b) => {
    const fA = a.fecha || '';
    const fB = b.fecha || '';
    return fB.localeCompare(fA);
  });
  
  sortedLotes.forEach((item) => {
    const origIndex = currentModalLotes.findIndex(x => x.lote === item.lote && x.fecha === item.fecha);
    
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--glass-border); margin-bottom: 4px;';
    
    const dateFormatted = item.fecha ? `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left:6px;">(${item.fecha})</span>` : '';
    
    row.innerHTML = `
      <div style="font-size:0.82rem; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; flex:1; padding-right:10px;">
        📦 Lote: <strong>${item.lote}</strong> ${dateFormatted} - <a href="${item.link}" target="_blank" style="color:var(--accent-color); text-decoration:none;">Ver Enlace 🔗</a>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button type="button" class="btn-secondary" onclick="editModalLote(${origIndex})" style="padding:4px 8px; font-size:0.75rem;">✏️</button>
        <button type="button" class="btn-danger" onclick="deleteModalLote(${origIndex})" style="padding:4px 8px; font-size:0.75rem; background:var(--danger-color); border:none; border-radius:4px; color:white; cursor:pointer;">🗑️</button>
      </div>`;
    modalLotesList.appendChild(row);
  });
}

function editModalLote(index) {
  const item = currentModalLotes[index];
  if (!item) return;
  document.getElementById('modal-lote-number').value = item.lote;
  document.getElementById('modal-lote-date').value = item.fecha || '';
  document.getElementById('modal-lote-link').value = item.link;
  document.getElementById('modal-lote-edit-index').value = index.toString();
  document.getElementById('btn-modal-add-lote').textContent = '💾 Actualizar';
}

function deleteModalLote(index) {
  if (!confirm('¿Eliminar este lote?')) return;
  currentModalLotes.splice(index, 1);
  renderModalLotes();
}

window.editModalLote = editModalLote;
window.deleteModalLote = deleteModalLote;

function handleAddModalLote() {
  const loteInput = document.getElementById('modal-lote-number');
  const dateInput = document.getElementById('modal-lote-date');
  const linkInput = document.getElementById('modal-lote-link');
  const editIndexInput = document.getElementById('modal-lote-edit-index');
  
  if (!loteInput || !linkInput || !dateInput) return;
  
  const lote = loteInput.value.trim();
  const fecha = dateInput.value.trim();
  const link = linkInput.value.trim();
  
  if (!lote || !link || !fecha) {
    return showToast('Por favor escribe el lote, selecciona la fecha y pega el enlace del certificado.', 'danger');
  }
  
  const editIdxStr = editIndexInput ? editIndexInput.value : '';
  
  if (editIdxStr !== '') {
    const idx = parseInt(editIdxStr);
    currentModalLotes[idx] = { lote, fecha, link };
  } else {
    const isDuplicate = currentModalLotes.some(item => item.lote.toLowerCase() === lote.toLowerCase());
    if (isDuplicate) {
      return showToast('Ya agregaste un certificado para este lote.', 'danger');
    }
    currentModalLotes.push({ lote, fecha, link });
  }
  
  loteInput.value = '';
  dateInput.value = '';
  linkInput.value = '';
  if (editIndexInput) editIndexInput.value = '';
  
  document.getElementById('btn-modal-add-lote').textContent = '➕ Guardar Lote';
  renderModalLotes();
}

function openSupplierModal(supplier = null) {
  populateFolderTypeDropdowns();
  populateCatalogsDropdowns();
  if (supplierCategoria) supplierCategoria.value = '';
  
  pendingFiles = {};
  
  // Clear modal document states
  Object.keys(DOC_FIELDS).forEach(key => {
    const conf = DOC_FIELDS[key];
    const statusEl = document.getElementById(conf.statusId);
    if (statusEl) statusEl.value = '';
    
    if (conf.venceId) {
      const venceEl = document.getElementById(conf.venceId);
      if (venceEl) venceEl.value = '';
    }
    
    if (conf.linkId) {
      const linkEl = document.getElementById(conf.linkId);
      if (linkEl) linkEl.value = '';
    }
    
    const fileInput = document.getElementById(conf.fileId);
    if (fileInput) fileInput.value = '';
    
    const textEl = document.getElementById(conf.statusTextId);
    if (textEl) {
      textEl.textContent = '❌ Sin doc';
      textEl.style.color = 'var(--text-secondary)';
      textEl.title = 'Sin archivo';
    }
  });

  const loteNumberInput = document.getElementById('modal-lote-number');
  const loteDateInput = document.getElementById('modal-lote-date');
  const loteLinkInput = document.getElementById('modal-lote-link');
  const loteEditIndex = document.getElementById('modal-lote-edit-index');
  const btnModalAddLote = document.getElementById('btn-modal-add-lote');
  if (loteNumberInput) loteNumberInput.value = '';
  if (loteDateInput) loteDateInput.value = '';
  if (loteLinkInput) loteLinkInput.value = '';
  if (loteEditIndex) loteEditIndex.value = '';
  if (btnModalAddLote) btnModalAddLote.textContent = '➕ Guardar Lote';

  const currentProvider = supplier ? (supplier.provider || '') : '';
  const currentDistributor = supplier ? (supplier.distributor || '') : '';
  const currentCliente = supplier ? (supplier.cliente || '') : '';
  
  populateChecklistCatalog('provider-checkbox-list', 'fabricante', currentProvider);
  populateChecklistCatalog('distributor-checkbox-list', 'proveedor', currentDistributor);
  populateChecklistCatalog('cliente-checkbox-list', 'cliente', currentCliente);

  if (supplier) {
    isAutoNaming = false;
    supplierModalTitle.textContent = '✏️ Editar Materia Prima / Insumo';
    supplierOldName.value        = supplier.folder_name;
    supplierNameInput.value      = supplier.folder_name;
    supplierFolderType.value     = supplier.folder_type;
    supplierMaterialInput.value  = supplier.material;
    supplierCodigoInput.value    = supplier.codigo     || '';
    supplierHaccpSelect.value    = supplier.riesgo_haccp || '';
    if (supplierCategoria) supplierCategoria.value = supplier.categoria || '';
    
    currentModalLotes = supplier.lotes_certificados || [];
    renderModalLotes();

    // Set document values & visual state
    Object.keys(DOC_FIELDS).forEach(key => {
      const conf = DOC_FIELDS[key];
      const statusEl = document.getElementById(conf.statusId);
      if (statusEl) statusEl.value = supplier[conf.dbKey] || '';
      
      if (conf.venceId && conf.venceDbKey) {
        const venceEl = document.getElementById(conf.venceId);
        if (venceEl) venceEl.value = supplier[conf.venceDbKey] || '';
      }
      
      if (conf.linkId && conf.linkDbKey) {
        const linkEl = document.getElementById(conf.linkId);
        if (linkEl) linkEl.value = supplier[conf.linkDbKey] || '';
      }
      
      const file = supplier.files?.find(f => f.category === conf.category);
      if (file) {
        const textEl = document.getElementById(conf.statusTextId);
        if (textEl) {
          textEl.textContent = `📎 Ver: ${file.name.slice(0, 15)}...`;
          textEl.style.color = 'var(--accent-color)';
          textEl.title = file.name;
        }
      }
    });
  } else {
    isAutoNaming = true;
    supplierModalTitle.textContent = '➕ Nuevo Registro';
    supplierOldName.value = '';
    supplierNameInput.value = '';
    const types = appData?.config?.folder_types || [];
    if (supplierFolderType) supplierFolderType.value = types.length ? types[0].name : '';
    if (supplierMaterialInput) supplierMaterialInput.value = '';
    if (supplierCodigoInput)   supplierCodigoInput.value   = '';
    if (supplierHaccpSelect)   supplierHaccpSelect.value   = '';
    currentModalLotes = [];
    renderModalLotes();
  }
  supplierModalBackdrop.classList.add('active');
}

function closeSupplierModal() { supplierModalBackdrop.classList.remove('active'); }

// ── SAVE SUPPLIER (Firestore) ─────────────────────────────────
async function handleSaveSupplier() {
  const oldName      = supplierOldName.value;
  const folderName   = supplierNameInput.value.trim();
  const material     = supplierMaterialInput.value.trim();
  
  if (!folderName || !material) {
    return showToast('Complete al menos el nombre de la materia prima.', 'danger');
  }

  btnSaveSupplier.disabled = true;
  btnSaveSupplier.textContent = 'Guardando...';
  
  try {
    let files = [];
    if (oldName && selectedSupplier?._id) {
      const docSnap = await db.collection('materias_primas').doc(selectedSupplier._id).get();
      files = docSnap.data()?.files || [];
    }
    
    for (const key of Object.keys(pendingFiles)) {
      const fileObj = pendingFiles[key];
      const conf = DOC_FIELDS[key];
      
      const storagePath = `documentos/${folderName}/${Date.now()}_${fileObj.name}`;
      const downloadURL = await uploadFileToStorage(storagePath, fileObj);
      
      const prevIndex = files.findIndex(f => f.category === conf.category);
      if (prevIndex !== -1) {
        const prevFile = files[prevIndex];
        if (prevFile && typeof prevFile.firebase_path === 'string' && prevFile.firebase_path.trim() !== '' && prevFile.firebase_path !== 'undefined' && prevFile.firebase_path !== 'null') {
          await storage.ref(prevFile.firebase_path).delete().catch(() => {});
        }
        files.splice(prevIndex, 1);
      }
      
      files.push({
        name:          fileObj.name,
        category:      conf.category,
        firebase_url:  downloadURL,
        firebase_path: storagePath,
        relative_path: `${supplierFolderType.value}/${folderName}/${fileObj.name}`,
        size_mb:       parseFloat((fileObj.size / (1024 * 1024)).toFixed(2)),
        last_modified: new Date().toISOString().split('T')[0]
      });
    }

    const selectedProviders = Array.from(document.querySelectorAll('.fabricante-select-chk:checked')).map(c => c.value).join(', ');
    const selectedDistributors = Array.from(document.querySelectorAll('.proveedor-select-chk:checked')).map(c => c.value).join(', ');
    const selectedClientes = Array.from(document.querySelectorAll('.cliente-select-chk:checked')).map(c => c.value).join(', ');

    const payload = {
      folder_name:  folderName,
      folder_type:  supplierFolderType.value,
      material:     material,
      categoria:    supplierCategoria ? supplierCategoria.value.trim() : '',
      provider:     selectedProviders || 'N/A',
      distributor:  selectedDistributors || 'N/A',
      codigo:       supplierCodigoInput.value.trim(),
      cliente:      selectedClientes || 'N/A',
      riesgo_haccp: supplierHaccpSelect.value,
      files:        files,
      files_count:  files.length,
      lotes_certificados: currentModalLotes
    };

    Object.keys(DOC_FIELDS).forEach(key => {
      const conf = DOC_FIELDS[key];
      const statusEl = document.getElementById(conf.statusId);
      payload[conf.dbKey] = statusEl ? statusEl.value.trim() : '';
      
      if (conf.venceId && conf.venceDbKey) {
        const venceEl = document.getElementById(conf.venceId);
        payload[conf.venceDbKey] = venceEl ? venceEl.value.trim() : '';
      }
      
      if (conf.linkId && conf.linkDbKey) {
        const linkEl = document.getElementById(conf.linkId);
        payload[conf.linkDbKey] = linkEl ? linkEl.value.trim() : '';
      }
    });

    if (oldName && selectedSupplier?._id) {
      await db.collection('materias_primas').doc(selectedSupplier._id).update(payload);
    } else {
      await db.collection('materias_primas').add(payload);
    }

    showToast(oldName ? 'Materia prima actualizada con éxito!' : 'Materia prima registrada con éxito!');
    closeSupplierModal();
    closeDrawer();
    await fetchData();
  } catch (e) {
    console.error(e);
    showToast('Error al guardar: ' + e.message, 'danger');
  } finally {
    btnSaveSupplier.disabled = false;
    btnSaveSupplier.textContent = '💾 Guardar Materia Prima';
  }
}

// ── DELETE SUPPLIER (Firestore) ───────────────────────────────
async function handleDeleteSupplier() {
  if (!selectedSupplier) return;
  if (!confirm(`¿Eliminar permanentemente "${selectedSupplier.folder_name}"? Esta acción es irreversible.`)) return;
  try {
    if (selectedSupplier._id) {
      await db.collection('materias_primas').doc(selectedSupplier._id).delete();
    }
    showToast('Registro eliminado con éxito.');
    closeDrawer();
    await fetchData();
  } catch (e) {
    console.error(e);
    showToast('Error al eliminar: ' + e.message, 'danger');
  }
}

// ── UPLOAD DOCUMENT (Firebase Storage + Firestore) ────────────
function uploadFileToStorage(storagePath, fileObject) {
  return new Promise((resolve, reject) => {
    const storageRef = storage.ref(storagePath);
    const uploadTask = storageRef.put(fileObject);
    uploadTask.on('state_changed',
      null,
      (err) => reject(err),
      () => {
        uploadTask.snapshot.ref.getDownloadURL()
          .then(url => resolve(url))
          .catch(err => reject(err));
      }
    );
  });
}

function openUploadModal() {
  uploadFileInput.value = '';
  uploadFileNameDisplay.textContent = 'Haga clic o arrastre un archivo aquí';
  uploadFileBytes = null; uploadFileName = ''; uploadFileObject = null;
  uploadModalBackdrop.classList.add('active');
}

function closeUploadModal() { uploadModalBackdrop.classList.remove('active'); }

function handleFileSelect(e) { if (e.target.files.length > 0) processFile(e.target.files[0]); }

function processFile(file) {
  uploadFileName   = file.name;
  uploadFileObject = file;
  uploadFileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
}

async function handleUploadSubmit() {
  if (!selectedSupplier) return;
  if (!uploadFileObject) return showToast('Por favor, seleccione un archivo.', 'danger');
  btnSubmitUpload.disabled = true;
  btnSubmitUpload.textContent = 'Subiendo...';
  try {
    const storagePath = `documentos/${selectedSupplier.folder_name}/${Date.now()}_${uploadFileName}`;
    const downloadURL = await uploadFileToStorage(storagePath, uploadFileObject);

    const docId = selectedSupplier._id;
    if (docId) {
      const docSnap = await db.collection('materias_primas').doc(docId).get();
      const files   = docSnap.data()?.files || [];
      files.push({
        name:          uploadFileName,
        category:      uploadDocType.value,
        firebase_url:  downloadURL,
        firebase_path: storagePath,
        relative_path: `${selectedSupplier.folder_type}/${selectedSupplier.folder_name}/${uploadFileName}`,
        size_mb:       parseFloat((uploadFileObject.size / (1024 * 1024)).toFixed(2)),
        last_modified: new Date().toISOString().split('T')[0]
      });
      await db.collection('materias_primas').doc(docId).update({ files, files_count: files.length });
    }
    showToast('Documento subido e indexado con éxito!');
    closeUploadModal();
    await fetchData();
    const updated = currentSuppliers.find(s => s.folder_name === selectedSupplier.folder_name);
    if (updated) openDrawer(updated);
  } catch (e) {
    console.error(e);
    showToast('Error al subir: ' + e.message, 'danger');
  } finally {
    btnSubmitUpload.disabled = false;
    btnSubmitUpload.textContent = 'Subir y Vincular';
  }
}

// ── CHECKLIST CONFIG (Tab 3) ──────────────────────────────────
function renderConfigChecklist() {
  if (!configChecklistList) return;
  configChecklistList.innerHTML = '';
  const activeCats = appData?.config?.checklist_categories || [];
  ALL_POSSIBLE_CATEGORIES.forEach(c => {
    const isActive   = activeCats.some(ac => ac.category === c.category);
    const activeItem = activeCats.find(ac => ac.category === c.category);
    const shortVal   = activeItem ? activeItem.short : c.short;
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
      const category   = chk.getAttribute('data-category');
      const shortField = configChecklistList.querySelector(`.config-short[data-category="${category}"]`);
      const short      = shortField ? shortField.value.trim().toUpperCase() : 'DOC';
      selectedCats.push({ category, short });
    }
  });
  if (!selectedCats.length) return showToast('Seleccione al menos una categoría.', 'danger');
  try {
    await db.collection('config').doc('app_config').update({ checklist_categories: selectedCats });
    if (appData.config) appData.config.checklist_categories = selectedCats;
    showToast('Configuración guardada con éxito en Firebase.');
  } catch (e) {
    showToast('Error al guardar config: ' + e.message, 'danger');
  }
}

// ── CATALOG MANAGEMENT (Tab 2) ────────────────────────────────
function updateCatalogUI() {
  if (!catalogSelectType) return;
  const type     = catalogSelectType.value;
  const isFolder = type === 'folder_types';
  
  const nitEl     = document.getElementById('catalog-nit-group');
  const contactEl = document.getElementById('catalog-contact-group');
  const certEl    = document.getElementById('catalog-cert-group');
  const rolesEl   = document.getElementById('catalog-roles-group');
  
  if (nitEl)     nitEl.style.display     = isFolder ? 'none' : 'block';
  if (contactEl) contactEl.style.display  = isFolder ? 'none' : 'block';
  if (certEl)    certEl.style.display     = isFolder ? 'none' : 'block';
  if (rolesEl)   rolesEl.style.display     = isFolder ? 'none' : 'block';
  
  const infos = {
    folder_types: { label: 'Nombre de Carpeta Física', info: '📁 Define las categorías principales de materias primas.', btn: '➕ Crear Categoría' },
    entities:     { label: 'Nombre de la Entidad',    info: '🏢 Listado único de Fabricantes, Proveedores y Clientes.', btn: '➕ Crear Entidad' }
  };
  const info = infos[type] || infos.entities;
  if (catalogFolderLabel) catalogFolderLabel.textContent = info.label;
  if (catalogContextInfo) catalogContextInfo.textContent = info.info;
  if (btnCatalogAddItem) {
    const isEdit = document.getElementById('catalog-edit-index').value !== '';
    btnCatalogAddItem.textContent = isEdit ? '💾 Guardar Cambios' : info.btn;
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
  if (!catalogItemsList || !appData) return;
  catalogItemsList.innerHTML = '';
  const type  = catalogSelectType ? catalogSelectType.value : 'entities';
  const items = appData.config[type] || [];
  if (catalogCountBadge) catalogCountBadge.textContent = items.length;
  if (!items.length) {
    catalogItemsList.innerHTML = '<div style="font-size:0.9rem;color:var(--text-secondary);text-align:center;padding:30px;">Catálogo vacío. Agrega el primer elemento.</div>';
    return;
  }
  items.forEach((item, index) => {
    const name       = typeof item === 'object' ? item.name       : item;
    const folderName = typeof item === 'object' ? item.folder_name : null;
    const nit        = typeof item === 'object' ? item.nit        : '';
    const contact    = typeof item === 'object' ? item.contact    : '';
    const cert       = typeof item === 'object' ? item.cert       : '';
    const certLinks  = typeof item === 'object' ? (item.cert_links || '') : '';
    
    let detailsHtml  = '';
    if (type !== 'folder_types') {
      const parts = [];
      if (nit)     parts.push(`<strong>NIT:</strong> ${nit}`);
      if (contact) parts.push(`<strong>Tel:</strong> ${contact}`);
      if (cert)    parts.push(`<strong>Cert SGC:</strong> ${cert}`);
      
      const rolesList = [];
      if (item.roles?.fabricante) rolesList.push('Fabricante 🏭');
      if (item.roles?.proveedor)  rolesList.push('Proveedor 🚚');
      if (item.roles?.cliente)    rolesList.push('Cliente 👥');
      if (rolesList.length) parts.push(`<strong>Roles:</strong> ${rolesList.join(', ')}`);
      
      if (parts.length) detailsHtml = `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;line-height:1.4;">${parts.join(' · ')}</div>`;
      
      if (certLinks) {
        let certButtonsHtml = '';
        const urls = certLinks.split(',').map(u => u.trim()).filter(Boolean);
        urls.forEach((url, idx) => {
          certButtonsHtml += `<a href="${url}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; color:var(--accent-color); text-decoration:none; font-weight:600; background:rgba(6,182,212,0.1); padding:2px 8px; border-radius:4px; margin-right:6px; margin-top:4px;">📜 Certificado ${urls.length > 1 ? (idx + 1) : ''}</a>`;
        });
        if (certButtonsHtml) {
          detailsHtml += `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">${certButtonsHtml}</div>`;
        }
      }
    }
    
    const row = document.createElement('div');
    row.className = 'catalog-item-row';
    row.style.cssText = 'flex-direction:column;align-items:stretch;gap:8px;';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="min-width:0;flex:1;padding-right:12px;">
          <div class="catalog-item-name" style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">${name}</div>
          ${folderName ? `<div style="font-size:0.8rem;color:var(--accent-color);margin-top:2px;">📁 Carpeta: ${folderName}</div>` : ''}
          ${detailsHtml}
        </div>
        <div class="catalog-item-actions" style="flex-shrink:0; display:flex; gap:6px;">
          <button class="btn-secondary btn-edit-cat" style="padding:6px 12px;font-size:0.8rem;">✏️ Editar</button>
          <button class="btn-danger btn-del-cat"  style="padding:6px 12px;font-size:0.8rem;background:var(--danger-color);border:none;border-radius:4px;cursor:pointer;">🗑️ Borrar</button>
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
  document.getElementById('catalog-new-nit-input').value    = '';
  document.getElementById('catalog-new-contact-input').value= '';
  document.getElementById('catalog-new-cert-input').value   = '';
  
  const certLinksInput = document.getElementById('catalog-new-cert-links-input');
  if (certLinksInput) certLinksInput.value = '';
  
  document.getElementById('catalog-role-fabricante').checked = false;
  document.getElementById('catalog-role-proveedor').checked  = false;
  document.getElementById('catalog-role-cliente').checked    = false;
  
  document.getElementById('catalog-edit-index').value       = '';
  document.getElementById('catalog-form-title').textContent = '➕ Registrar Nuevo Elemento';
  document.getElementById('btn-catalog-cancel-edit').style.display = 'none';
  updateCatalogUI();
}

async function handleCatalogAddItem() {
  const name = catalogNewItemInput.value.trim();
  if (!name) return showToast('El nombre no puede estar vacío.', 'danger');
  const type       = catalogSelectType ? catalogSelectType.value : 'entities';
  const rawFolder  = catalogNewFolderInput ? catalogNewFolderInput.value.trim() : '';
  const folderName = rawFolder || name.replace(/[\\/:*?"<>|]/g, '_').toUpperCase().replace(/\s+/g, '_');
  
  const nit        = document.getElementById('catalog-new-nit-input').value.trim();
  const contact    = document.getElementById('catalog-new-contact-input').value.trim();
  const cert       = document.getElementById('catalog-new-cert-input').value.trim();
  const certLinksInput = document.getElementById('catalog-new-cert-links-input');
  const cert_links = certLinksInput ? certLinksInput.value.trim() : '';
  
  const isFab      = document.getElementById('catalog-role-fabricante').checked;
  const isProv     = document.getElementById('catalog-role-proveedor').checked;
  const isCli      = document.getElementById('catalog-role-cliente').checked;
  
  const editIndexVal = document.getElementById('catalog-edit-index').value;
  const isEdit     = editIndexVal !== '';

  if (!appData.config[type]) appData.config[type] = [];

  if (!isEdit) {
    const isDuplicate = (appData.config[type] || []).some(i => (typeof i === 'object' ? i.name : i) === name);
    if (isDuplicate) return showToast('Ya existe un elemento con ese nombre.', 'danger');
  }

  try {
    const newItem = type === 'folder_types'
      ? { name, folder_name: folderName }
      : { name, folder_name: folderName, nit, contact, cert, cert_links, roles: { fabricante: isFab, proveedor: isProv, cliente: isCli } };

    if (isEdit) {
      appData.config[type][parseInt(editIndexVal)] = newItem;
    } else {
      appData.config[type].push(newItem);
    }

    await db.collection('config').doc('app_config').update({ [type]: appData.config[type] });
    showToast(isEdit ? `✅ "${name}" actualizado con éxito` : `✅ "${name}" registrado con éxito`);
    clearCatalogForm();
    renderCatalogItemsList();
    populateCatalogsDropdowns();
  } catch (e) {
    console.error(e);
    showToast('Error al guardar en Firebase: ' + e.message, 'danger');
  }
}

function handleEditCatalogItem(type, index) {
  const items = appData.config[type] || [];
  const item  = items[index];
  if (!item) return;
  catalogNewItemInput.value   = typeof item === 'object' ? item.name       : item;
  catalogNewFolderInput.value = typeof item === 'object' ? item.folder_name : '';
  
  if (type !== 'folder_types') {
    document.getElementById('catalog-new-nit-input').value     = item.nit     || '';
    document.getElementById('catalog-new-contact-input').value = item.contact || '';
    document.getElementById('catalog-new-cert-input').value    = item.cert    || '';
    
    const certLinksInput = document.getElementById('catalog-new-cert-links-input');
    if (certLinksInput) certLinksInput.value = item.cert_links || '';
    
    if (item.roles) {
      document.getElementById('catalog-role-fabricante').checked = !!item.roles.fabricante;
      document.getElementById('catalog-role-proveedor').checked  = !!item.roles.proveedor;
      document.getElementById('catalog-role-cliente').checked    = !!item.roles.cliente;
    } else {
      document.getElementById('catalog-role-fabricante').checked = false;
      document.getElementById('catalog-role-proveedor').checked  = false;
      document.getElementById('catalog-role-cliente').checked    = false;
    }
  }
  document.getElementById('catalog-edit-index').value       = index.toString();
  document.getElementById('catalog-form-title').textContent = '✏️ Editar Elemento';
  document.getElementById('btn-catalog-cancel-edit').style.display = 'block';
  updateCatalogUI();
  document.querySelector('.catalog-add-form').scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteCatalogItem(type, index) {
  const items = appData.config[type] || [];
  const item  = items[index];
  if (!item) return;
  const name = typeof item === 'object' ? item.name : item;
  if (!confirm(`¿Eliminar "${name}" del catálogo?`)) return;
  try {
    appData.config[type].splice(index, 1);
    await db.collection('config').doc('app_config').update({ [type]: appData.config[type] });
    showToast(`✅ "${name}" eliminado.`);
    renderCatalogItemsList();
    populateCatalogsDropdowns();
  } catch (e) {
    showToast('Error al eliminar: ' + e.message, 'danger');
  }
}

// ── SYNC EXCEL (no disponible en versión Firebase) ────────────
function handleSyncExcel() {
  showToast('Sincronización con Excel no disponible en modo Firebase. Edite los registros directamente desde la app.', 'warning');
}



let excelFileObject = null;

function handleExcelFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    excelFileObject = file;
    excelFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    btnSubmitExcelImport.disabled = false;
  }
}

async function handleImportExcel() {
  if (!excelFileObject) return;
  btnSubmitExcelImport.disabled = true;
  btnSubmitExcelImport.textContent = 'Importando...';
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rows.length < 3) {
        throw new Error('El archivo no contiene suficientes filas (mínimo 2 de cabecera y 1 de datos).');
      }
      
      const importMode = document.querySelector('input[name="excel-import-mode"]:checked').value;
      
      if (importMode === 'overwrite') {
        const snap = await db.collection('materias_primas').get();
        for (const doc of snap.docs) {
          await doc.ref.delete();
        }
        showToast('Base de datos limpiada para sobrescritura.', 'warning');
      }
      
      const entities = appData.config.entities || [];
      const entityNames = entities.map(e => e.name.toLowerCase().trim());
      let configChanged = false;
      
      let importedCount = 0;
      
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        
        const codigo       = String(row[0] || '').trim();
        const material     = String(row[1] || '').trim();
        const categoria    = String(row[2] || '').trim();
        const provider     = String(row[3] || 'N/A').trim();
        const distributor  = String(row[4] || 'N/A').trim();
        const cliente      = String(row[5] || 'N/A').trim();
        
        if (!material) continue;
        
        // Auto-create manufacturer
        if (provider !== 'N/A' && !entityNames.includes(provider.toLowerCase())) {
          entities.push({
            name: provider,
            folder_name: provider.toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_'),
            nit: '', contact: '', cert: '',
            roles: { fabricante: true, proveedor: false, cliente: false }
          });
          entityNames.push(provider.toLowerCase());
          configChanged = true;
        }
        
        // Auto-create supplier/distributor
        if (distributor !== 'N/A') {
          const lowerDist = distributor.toLowerCase();
          const existingIdx = entities.findIndex(e => e.name.toLowerCase().trim() === lowerDist);
          if (existingIdx !== -1) {
            if (!entities[existingIdx].roles.proveedor) {
              entities[existingIdx].roles.proveedor = true;
              configChanged = true;
            }
          } else {
            entities.push({
              name: distributor,
              folder_name: distributor.toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_'),
              nit: '', contact: '', cert: '',
              roles: { fabricante: false, proveedor: true, cliente: false }
            });
            entityNames.push(lowerDist);
            configChanged = true;
          }
        }
        
        // Auto-create client
        if (cliente !== 'N/A' && cliente !== 'TODOS') {
          const lowerCli = cliente.toLowerCase();
          const existingIdx = entities.findIndex(e => e.name.toLowerCase().trim() === lowerCli);
          if (existingIdx !== -1) {
            if (!entities[existingIdx].roles.cliente) {
              entities[existingIdx].roles.cliente = true;
              configChanged = true;
            }
          } else {
            entities.push({
              name: cliente,
              folder_name: cliente.toUpperCase().replace(/[\\/:*?\"<>|]/g, '_').replace(/\s+/g, '_'),
              nit: '', contact: '', cert: '',
              roles: { fabricante: false, proveedor: false, cliente: true }
            });
            entityNames.push(lowerCli);
            configChanged = true;
          }
        }
        
        // Match category tab
        let folderType = 'Proveedores Materia Prima';
        const catLower = categoria.toLowerCase();
        if (catLower.includes('servicio')) {
          folderType = 'Proveedores Servicios';
        } else if (catLower.includes('insumo') || catLower.includes('envase') || catLower.includes('tapa') || catLower.includes('bolsa')) {
          folderType = 'Proveedores Insumos';
        }
        
        // Standard folder name
        const cleanMat = material.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const cleanProv = provider.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const cleanDist = distributor.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const folderName = [cleanMat, cleanProv, cleanDist].filter(x => x.length > 0).join('_');
        
        const doc_status_ft             = String(row[6]  || 'No').trim();
        const doc_status_ft_interna     = String(row[7]  || 'No').trim();
        const doc_status_acta           = String(row[8]  || 'No').trim();
        const riesgo_haccp              = String(row[9]  || 'N/A').trim();
        const doc_status_cert_tipo      = String(row[10] || 'No').trim();
        const doc_status_cert_vence     = String(row[11] || '').trim();
        const doc_status_alergenos      = String(row[12] || 'No').trim();
        const doc_status_apto           = String(row[13] || 'No').trim();
        const doc_status_fq             = String(row[14] || 'No').trim();
        const doc_status_fraude         = String(row[15] || 'No').trim();
        const doc_status_especificacion = String(row[16] || 'No').trim();
        const doc_status_otras          = String(row[17] || 'No').trim();
        
        const newProductPayload = {
          codigo,
          material,
          categoria,
          provider,
          distributor,
          cliente,
          folder_type: folderType,
          folder_name: folderName,
          riesgo_haccp,
          doc_status_ft,
          doc_status_ft_interna,
          doc_status_acta,
          doc_status_cert_tipo,
          doc_status_cert_vence,
          doc_status_alergenos,
          doc_status_apto,
          doc_status_fq,
          doc_status_fraude,
          doc_status_especificacion,
          doc_status_otras
        };
        
        if (importMode === 'merge') {
          const querySnap = await db.collection('materias_primas').where('folder_name', '==', folderName).get();
          if (!querySnap.empty) {
            const matchedDoc = querySnap.docs[0];
            const existingFiles = matchedDoc.data().files || [];
            newProductPayload.files = existingFiles;
            newProductPayload.files_count = existingFiles.length;
            await matchedDoc.ref.update(newProductPayload);
          } else {
            newProductPayload.files = [];
            newProductPayload.files_count = 0;
            await db.collection('materias_primas').add(newProductPayload);
          }
        } else {
          newProductPayload.files = [];
          newProductPayload.files_count = 0;
          await db.collection('materias_primas').add(newProductPayload);
        }
        
        importedCount++;
      }
      
      if (configChanged) {
        appData.config.entities = entities;
        await saveConfigOnFirebase();
      }
      
      showToast(`🎉 Importación completada: ${importedCount} materias primas procesadas.`);
      excelFileObject = null;
      excelFileInput.value = '';
      excelFileName.textContent = 'Haga clic o arrastre su archivo Excel consolidado aquí';
      btnSubmitExcelImport.disabled = true;
      
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast(`Error al parsear Excel: ${err.message}`, 'danger');
    } finally {
      btnSubmitExcelImport.disabled = false;
      btnSubmitExcelImport.textContent = '🚀 Iniciar Importación de Excel';
    }
  };
  reader.readAsArrayBuffer(excelFileObject);
}

function handleExportExcel() {
  if (!currentSuppliers || !currentSuppliers.length) {
    return showToast('No hay datos disponibles para exportar.', 'danger');
  }
  
  function getExcelStatusWithLink(status, link) {
    const statusStr = (status || '').trim();
    const linkStr = (link || '').trim();
    if (linkStr) {
      return statusStr ? `${statusStr} (${linkStr})` : linkStr;
    }
    return statusStr;
  }
  
  const row1 = [
    "CÓDIGO",
    "NOMBRE MATERIA PRIMA",
    "CATEGORIA",
    "FABRICANTE",
    "PROVEEDOR/DISTRIBUIDOR",
    "CLIENTE",
    "FICHA TÉCNICA", "",
    "ACTA SANITARIA\nAÑO DE VISITA distribuidor o fabricante",
    "RIESGO HACCP",
    "CERTIFICACIÓN (SISTEMA DE GESTIÓN DE CALIDAD E INOCUIDAD) DEL PROVEEDOR\nFECHA DE VENCIMIENTO", "",
    "DECLARACIÓN DE ALERGENOS SOLO MATERIA PRIMA",
    "DECLARACIÓN DE APTO PARA CONTACTO CON ALIMENTOS SOLO ENVASES Y TAPA",
    "ANALISIS FQ",
    "CARTAS FIRMADAS", "", ""
  ];
  
  const row2 = [
    "",
    "",
    "",
    "",
    "",
    "",
    "FABRICANTE",
    "INTERNA",
    "",
    "",
    "TIPO",
    "FECHA DE VENCIMIENTO",
    "",
    "",
    "",
    "FRAUDE",
    "ESPECIFICACIÓN",
    "OTRAS"
  ];
  
  const dataRows = currentSuppliers.map(s => [
    s.codigo || '',
    s.material || '',
    s.categoria || s.folder_type || '',
    s.provider || '',
    s.distributor || '',
    s.cliente || '',
    getExcelStatusWithLink(s.doc_status_ft, s.doc_link_ft),
    getExcelStatusWithLink(s.doc_status_ft_interna, s.doc_link_ft_interna),
    getExcelStatusWithLink(s.doc_status_acta, s.doc_link_acta),
    s.riesgo_haccp || '',
    getExcelStatusWithLink(s.doc_status_cert_tipo, s.doc_link_cert),
    s.doc_status_cert_vence || '',
    getExcelStatusWithLink(s.doc_status_alergenos, s.doc_link_alergenos),
    getExcelStatusWithLink(s.doc_status_apto, s.doc_link_apto),
    getExcelStatusWithLink(s.doc_status_fq, s.doc_link_fq),
    getExcelStatusWithLink(s.doc_status_fraude, s.doc_link_fraude),
    getExcelStatusWithLink(s.doc_status_especificacion, s.doc_link_especificacion),
    getExcelStatusWithLink(s.doc_status_otras, s.doc_link_otras)
  ]);
  
  const allRows = [row1, row2, ...dataRows];
  
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  
  ws['!merges'] = [
    { s: { r: 0, c: 6 }, e: { r: 0, c: 7 } }, // G1:H1
    { s: { r: 0, c: 10 }, e: { r: 0, c: 11 } }, // K1:L1
    { s: { r: 0, c: 15 }, e: { r: 0, c: 17 } }, // P1:R1
    
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } },
    { s: { r: 0, c: 4 }, e: { r: 1, c: 4 } },
    { s: { r: 0, c: 5 }, e: { r: 1, c: 5 } },
    { s: { r: 0, c: 8 }, e: { r: 1, c: 8 } },
    { s: { r: 0, c: 9 }, e: { r: 1, c: 9 } },
    { s: { r: 0, c: 12 }, e: { r: 1, c: 12 } },
    { s: { r: 0, c: 13 }, e: { r: 1, c: 13 } },
    { s: { r: 0, c: 14 }, e: { r: 1, c: 14 } }
  ];
  
  ws['!cols'] = [
    { wch: 10 }, // Código
    { wch: 30 }, // Nombre
    { wch: 18 }, // Categoría
    { wch: 22 }, // Fabricante
    { wch: 22 }, // Proveedor
    { wch: 15 }, // Cliente
    { wch: 12 }, // FT Fab
    { wch: 12 }, // FT Int
    { wch: 15 }, // Acta Sanitaria
    { wch: 12 }, // HACCP
    { wch: 15 }, // Cert Tipo
    { wch: 15 }, // Cert Vence
    { wch: 15 }, // Alergenos
    { wch: 15 }, // Apto
    { wch: 12 }, // FQ
    { wch: 10 }, // Fraude
    { wch: 15 }, // Especificación
    { wch: 10 }  // Otras
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
  XLSX.writeFile(wb, "consolidado_documentos_mp.xlsx");
  showToast('Excel generado y descargado con éxito!');
}

function handleReportSupplier() {
  if (!selectedSupplier) return;
  const s = selectedSupplier;
  
  const printWindow = window.open('', '_blank');
  
  const docsHtml = [
    { label: 'Ficha Técnica (FT) Fabricante', status: s.doc_status_ft, link: s.doc_link_ft, category: 'Ficha Técnica (FT)' },
    { label: 'Ficha Técnica Interna', status: s.doc_status_ft_interna, link: s.doc_link_ft_interna, category: 'Ficha Técnica Interna' },
    { label: 'Acta Sanitaria (Año Visita)', status: s.doc_status_acta, link: s.doc_link_acta, category: 'Acta Sanitaria' },
    { label: 'Certificación SGC Proveedor', status: (s.doc_status_cert_tipo ? `${s.doc_status_cert_tipo} ${s.doc_status_cert_vence ? '(Vence: ' + s.doc_status_cert_vence + ')' : ''}` : 'No'), link: s.doc_link_cert, category: 'Certificación Proveedor' },
    { label: 'Declaración Alérgenos (Materia Prima)', status: s.doc_status_alergenos, link: s.doc_link_alergenos, category: 'Declaración de Alérgenos' },
    { label: 'Apto Alimentos (Envase/Tapa)', status: s.doc_status_apto, link: s.doc_link_apto, category: 'Declaración Apto Alimentos' },
    { label: 'Análisis FQ (Metales/Pest.)', status: s.doc_status_fq, link: s.doc_link_fq, category: 'Análisis FQ' },
    { label: 'Carta Firmada: Fraude', status: s.doc_status_fraude, link: s.doc_link_fraude, category: 'Carta Fraude' },
    { label: 'Carta Firmada: Especificación', status: s.doc_status_especificacion, link: s.doc_link_especificacion, category: 'Carta Especificacion' },
    { label: 'Carta Firmada: Otras', status: s.doc_status_otras, link: s.doc_link_otras, category: 'Otros Documentos' }
  ].map(doc => {
    const valClean = (doc.status || '').toLowerCase().trim();
    
    let valUrl = (doc.link || '').trim();
    if (!valUrl) {
      const urlMatch = (doc.status || '').match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) valUrl = urlMatch[1];
    }
    const isUrl = !!valUrl;
    
    let displayVal = doc.status || 'No';
    if (isUrl && !doc.link) {
      displayVal = (doc.status || '').replace(valUrl, '').replace(/\|/g, '').trim();
    }
    if (!displayVal || (displayVal.toLowerCase() === 'no' && isUrl)) displayVal = 'Enlace Adjunto';

    const isCompleted = isUrl || valClean === 'si' || valClean === 'en carta' || /^\d{4}$/.test(valClean) || valClean.includes('vence') || valClean.includes('completo') || valClean.includes('aplica') || valClean.includes('carta');
    const isPending = !isUrl && (!doc.status || valClean === 'no' || valClean === 'x' || valClean === '');
    const statusText = isCompleted ? '🟢 CUMPLE' : isPending ? '🔴 PENDIENTE' : '🟡 PARCIAL';
    
    const file = s.files?.find(f => f.category === doc.category);
    let fileStatus = '';
    
    if (isUrl) {
      fileStatus = `<a href="${valUrl}" target="_blank" style="color:#0056b3; font-weight:600; text-decoration:none;">🔗 Ver Enlace (Drive/Otro)</a>`;
    }
    if (file) {
      const fileLink = file.firebase_url || '';
      const fileText = `📄 PDF: ${file.name}`;
      const linkHtml = fileLink ? `<a href="${fileLink}" target="_blank" style="color:#0056b3; font-weight:600; text-decoration:none;">${fileText}</a>` : fileText;
      fileStatus = fileStatus ? `${fileStatus} | ${linkHtml}` : linkHtml;
    }
    if (!fileStatus) {
      fileStatus = 'Sin archivo físico ni enlace';
    }
    
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: 500;">${doc.label}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${displayVal}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; color: ${isCompleted ? '#10b981' : isPending ? '#ef4444' : '#f59e0b'};">${statusText}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-size: 0.85rem; color: #555;">${fileStatus}</td>
      </tr>`;
  }).join('');
  
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte de Cumplimiento - ${s.material}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0056b3; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 1.8rem; font-weight: bold; color: #0056b3; }
        .date { font-size: 0.9rem; color: #666; }
        .title { font-size: 1.6rem; font-weight: 700; margin-bottom: 20px; color: #111; text-transform: uppercase; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .meta-table td { padding: 8px 12px; border: 1px solid #ddd; }
        .meta-label { font-weight: bold; background-color: #f7f9fa; width: 25%; }
        .doc-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .doc-table th { background-color: #0056b3; color: white; text-align: left; padding: 12px 10px; font-weight: 600; }
        .footer { margin-top: 50px; text-align: center; font-size: 0.85rem; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print();" style="padding: 10px 20px; background: #0056b3; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;">🖨️ Imprimir Reporte</button>
      </div>
      <div class="header">
        <div class="logo">SISTEMA DE GESTIÓN DE CALIDAD</div>
        <div class="date">Fecha de generación: ${new Date().toLocaleDateString('es-CO')}</div>
      </div>
      
      <div class="title">REPORTE DE CUMPLIMIENTO DOCUMENTAL DE MATERIA PRIMA</div>
      
      <table class="meta-table">
        <tr>
          <td class="meta-label">Materia Prima</td>
          <td colspan="3" style="font-size: 1.1rem; font-weight: bold;">${s.material}</td>
        </tr>
        <tr>
          <td class="meta-label">Código</td>
          <td>${s.codigo || '—'}</td>
          <td class="meta-label">Categoría Excel</td>
          <td>${s.categoria || s.folder_type || '—'}</td>
        </tr>
        <tr>
          <td class="meta-label">Fabricante</td>
          <td>${s.provider || 'N/A'}</td>
          <td class="meta-label">Proveedor / Distribuidor</td>
          <td>${s.distributor || 'N/A'}</td>
        </tr>
        <tr>
          <td class="meta-label">Cliente</td>
          <td>${s.cliente || '—'}</td>
          <td class="meta-label">Riesgo HACCP</td>
          <td style="font-weight: 600; color: ${s.riesgo_haccp === 'Alto' ? '#ef4444' : s.riesgo_haccp === 'Medio' ? '#f59e0b' : '#10b981'}">${s.riesgo_haccp || 'N/A'}</td>
        </tr>
      </table>
      
      <h3 style="color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 8px;">ESTADO DE REQUISITOS</h3>
      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 35%;">Requisito / Documento</th>
            <th style="width: 25%;">Valor Registrado</th>
            <th style="width: 15%;">Estado</th>
            <th style="width: 25%;">Archivo Físico</th>
          </tr>
        </thead>
        <tbody>
          ${docsHtml}
        </tbody>
      </table>
      
      <div class="footer">
        Este documento es un reporte automático de control de calidad generado por la plataforma web.<br>
        <strong>Control de Proveedores e Inocuidad Alimentaria</strong><br>
        <span style="font-size: 0.8rem; color: #888; display: inline-block; margin-top: 6px;">Elaborado por <a href="https://expandete.cloud" target="_blank" style="color: #0056b3; text-decoration: none; font-weight: bold;">expandete.cloud</a></span>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(content);
  printWindow.document.close();
}

// ── EVENT LISTENERS ───────────────────────────────────────────
function setupEventListeners() {
  if (tabBtnPlanilla) tabBtnPlanilla.addEventListener('click', () => switchWorkspaceTab('planilla'));
  if (tabBtnCatalogos) tabBtnCatalogos.addEventListener('click', () => switchWorkspaceTab('catalogos'));
  if (tabBtnDocumentacion) tabBtnDocumentacion.addEventListener('click', () => switchWorkspaceTab('documentacion'));
  if (tabBtnExcel) tabBtnExcel.addEventListener('click', () => switchWorkspaceTab('excel'));
  if (btnExportExcel) btnExportExcel.addEventListener('click', handleExportExcel);
  if (excelDropZone) excelDropZone.addEventListener('click', () => excelFileInput.click());
  if (excelFileInput) excelFileInput.addEventListener('change', handleExcelFileSelect);
  if (btnSubmitExcelImport) btnSubmitExcelImport.addEventListener('click', handleImportExcel);
  if (btnReportSupplier) btnReportSupplier.addEventListener('click', handleReportSupplier);

  if (supplierMaterialInput) supplierMaterialInput.addEventListener('input', autoGenerateFolderName);

  const provChecklist = document.getElementById('provider-checkbox-list');
  if (provChecklist) {
    provChecklist.addEventListener('change', (e) => {
      if (e.target.classList.contains('fabricante-select-chk')) autoGenerateFolderName();
    });
  }
  const distChecklist = document.getElementById('distributor-checkbox-list');
  if (distChecklist) {
    distChecklist.addEventListener('change', (e) => {
      if (e.target.classList.contains('proveedor-select-chk')) autoGenerateFolderName();
    });
  }

  const btnQuickAddProv = document.getElementById('btn-quick-add-provider');
  if (btnQuickAddProv) {
    btnQuickAddProv.addEventListener('click', () => {
      handleQuickAddEntity('new-provider-quick-add', 'provider-checkbox-list', 'fabricante');
    });
  }
  const btnQuickAddDist = document.getElementById('btn-quick-add-distributor');
  if (btnQuickAddDist) {
    btnQuickAddDist.addEventListener('click', () => {
      handleQuickAddEntity('new-distributor-quick-add', 'distributor-checkbox-list', 'proveedor');
    });
  }
  const btnQuickAddCli = document.getElementById('btn-quick-add-cliente');
  if (btnQuickAddCli) {
    btnQuickAddCli.addEventListener('click', () => {
      handleQuickAddEntity('new-cliente-quick-add', 'cliente-checkbox-list', 'cliente');
    });
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (filterType) filterType.addEventListener('change', applyFilters);
  if (filterFabricante) filterFabricante.addEventListener('change', applyFilters);
  if (filterDistribuidor) filterDistribuidor.addEventListener('change', applyFilters);
  if (filterHaccp) filterHaccp.addEventListener('change', applyFilters);
  if (filterStatus) filterStatus.addEventListener('change', applyFilters);

  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  if (btnNewSupplier) btnNewSupplier.addEventListener('click', () => openSupplierModal(null));
  if (btnEditSupplier) btnEditSupplier.addEventListener('click', () => { if (selectedSupplier) openSupplierModal(selectedSupplier); });
  if (btnDeleteSupplier) btnDeleteSupplier.addEventListener('click', handleDeleteSupplier);
  if (btnSaveSupplier) btnSaveSupplier.addEventListener('click', handleSaveSupplier);
  if (btnCloseSupplierModal) btnCloseSupplierModal.addEventListener('click', closeSupplierModal);
  if (btnCancelSupplierModal) btnCancelSupplierModal.addEventListener('click', closeSupplierModal);
  
  const btnModalAddLote = document.getElementById('btn-modal-add-lote');
  if (btnModalAddLote) btnModalAddLote.addEventListener('click', handleAddModalLote);

  if (btnSyncExcel) btnSyncExcel.addEventListener('click', handleSyncExcel);

  if (btnUploadDoc) btnUploadDoc.addEventListener('click', openUploadModal);
  if (btnCloseUploadModal) btnCloseUploadModal.addEventListener('click', closeUploadModal);
  if (btnCancelUploadModal) btnCancelUploadModal.addEventListener('click', closeUploadModal);

  if (dropZone) dropZone.addEventListener('click', () => uploadFileInput && uploadFileInput.click());
  if (uploadFileInput) uploadFileInput.addEventListener('change', handleFileSelect);
  if (btnSubmitUpload) btnSubmitUpload.addEventListener('click', handleUploadSubmit);

  if (catalogSelectType) catalogSelectType.addEventListener('change', () => { updateCatalogUI(); renderCatalogItemsList(); });
  if (btnCatalogAddItem) btnCatalogAddItem.addEventListener('click', handleCatalogAddItem);
  const btnCatalogCancelEdit = document.getElementById('btn-catalog-cancel-edit');
  if (btnCatalogCancelEdit) btnCatalogCancelEdit.addEventListener('click', clearCatalogForm);
  if (catalogSearchInput) catalogSearchInput.addEventListener('input', filterCatalogItems);

  if (btnSaveConfig) btnSaveConfig.addEventListener('click', handleSaveConfig);
  if (configSearchInput) configSearchInput.addEventListener('input', filterConfigItems);

  if (drawerFileSearch) drawerFileSearch.addEventListener('input', filterDrawerFiles);
  
  const drawerLotesSearch = document.getElementById('drawer-lotes-search');
  if (drawerLotesSearch) {
    drawerLotesSearch.addEventListener('input', (e) => {
      renderDrawerLotes(e.target.value);
    });
  }

  // Bind change listeners to the 10 document file inputs
  Object.keys(DOC_FIELDS).forEach(key => {
    const conf = DOC_FIELDS[key];
    const fileEl = document.getElementById(conf.fileId);
    const textEl = document.getElementById(conf.statusTextId);
    if (fileEl) {
      fileEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          pendingFiles[key] = file;
          if (textEl) {
            textEl.textContent = `🟢 Listo: ${file.name.slice(0, 15)}...`;
            textEl.style.color = '#10b981';
            textEl.title = file.name;
          }
        }
      });
    }
  });

  // Autenticación (Login & Logout)
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value;
      
      btnLoginSubmit.disabled = true;
      const originalText = btnLoginSubmit.innerHTML;
      btnLoginSubmit.innerHTML = '<span>⏳ Iniciando sesión...</span>';
      if (loginErrorMsg) loginErrorMsg.style.display = 'none';

      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
      } catch (err) {
        console.error(err);
        let errorMsg = 'Error al iniciar sesión. Verifique sus credenciales.';
        if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          errorMsg = 'Usuario o contraseña incorrectos.';
        } else if (err.code === 'auth/invalid-email') {
          errorMsg = 'El formato del correo es inválido.';
        }
        if (loginErrorMsg) {
          loginErrorMsg.textContent = errorMsg;
          loginErrorMsg.style.display = 'block';
        }
      } finally {
        btnLoginSubmit.disabled = false;
        btnLoginSubmit.innerHTML = originalText;
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await firebase.auth().signOut();
        showToast('Sesión cerrada con éxito');
      } catch (err) {
        console.error(err);
        showToast('Error al cerrar sesión', 'danger');
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer(); closeSupplierModal(); closeUploadModal(); }
  });
}
