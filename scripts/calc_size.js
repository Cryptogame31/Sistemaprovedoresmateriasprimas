const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, '..', 'data.json');

let rawJson = fs.readFileSync(DATA_PATH, 'utf-8');
if (rawJson.charCodeAt(0) === 0xFEFF) rawJson = rawJson.slice(1);
const rawData = JSON.parse(rawJson);

let totalSize = 0;
let fileCount = 0;

Object.keys(rawData.data || {}).forEach(cat => {
  rawData.data[cat].forEach(supplier => {
    (supplier.files || []).forEach(f => {
      totalSize += f.size_mb || 0;
      fileCount++;
    });
  });
});

console.log(`\n📊 Estadísticas de archivos locales:`);
console.log(`   • Total de archivos: ${fileCount}`);
console.log(`   • Tamaño total estimado: ${totalSize.toFixed(2)} MB (${(totalSize / 1024).toFixed(2)} GB)\n`);
