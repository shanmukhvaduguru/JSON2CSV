const { stringify } = require('csv-stringify/sync');
const XLSX = require('xlsx');

/**
 * Export data to CSV string with UTF-8 BOM for Excel compatibility.
 * @param {Array<Object>} data
 * @param {string[]} columns
 * @returns {string}
 */
function toCSV(data, columns) {
  const rows = data.map(row => columns.map(col => row[col] !== undefined ? row[col] : ''));
  const csv = stringify([columns, ...rows]);
  // Prepend UTF-8 BOM so Excel opens without encoding issues
  return '\uFEFF' + csv;
}

/**
 * Export data to Excel (.xlsx) Buffer.
 * @param {Array<Object>} data
 * @param {string[]} columns
 * @returns {Buffer}
 */
function toExcel(data, columns) {
  const aoaRows = [
    columns,
    ...data.map(row => columns.map(col => row[col] !== undefined ? row[col] : ''))
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoaRows);

  // Auto-size column widths
  ws['!cols'] = columns.map(col => {
    const maxLen = Math.max(
      col.length,
      10,
      ...data.map(row => String(row[col] !== undefined ? row[col] : '').length)
    );
    return { wch: Math.min(maxLen, 60) }; // cap at 60 chars wide
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { toCSV, toExcel };
