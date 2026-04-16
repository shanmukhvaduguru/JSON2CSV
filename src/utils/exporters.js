import * as XLSX from 'xlsx'

export function exportCsv(data, columns) {
  const BOM = '\uFEFF'
  const esc = v => {
    const s = String(v === null || v === undefined ? '' : v)
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const rows = [
    columns.map(esc).join(','),
    ...data.map(row => columns.map(c => esc(row[c] !== undefined ? row[c] : '')).join(',')),
  ]
  triggerDownload(
    new Blob([BOM + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }),
    'export.csv'
  )
}

export function exportExcel(data, columns) {
  const aoa = [
    columns,
    ...data.map(row => columns.map(c => (row[c] !== undefined ? row[c] : ''))),
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = columns.map(col => {
    let max = col.length
    data.forEach(row => {
      const len = row[col] !== undefined && row[col] !== null ? String(row[col]).length : 0
      if (len > max) max = len
    })
    return { wch: Math.min(max + 2, 50) }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'export.xlsx'
  )
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
