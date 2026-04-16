import { useState, useMemo, useCallback } from 'react'
import { exportCsv, exportExcel } from '../utils/exporters'

// ── Helpers ───────────────────────────────────────────────────────────────────

function cellStr(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function cellDisplay(value) {
  const full = cellStr(value)
  return full.length > 30 ? full.slice(0, 30) + '…' : full
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CellContent({ value, rowKey, colKey, onCopy, copiedKey }) {
  const full    = cellStr(value)
  const display = cellDisplay(value)
  const key     = `${rowKey}-${colKey}`
  const copied  = copiedKey === key

  return (
    <div className="cell-wrapper">
      <span className="cell-text" title={full}>{display}</span>
      <span className="cell-actions">
        {copied
          ? <span className="copied-toast">Copied!</span>
          : <button className="cell-icon" title="Copy value" onClick={() => onCopy(key, full)}>⎘</button>
        }
      </span>
    </div>
  )
}

function EditModal({ editCell, editValue, onChangeValue, onSave, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit — <code>{editCell.col}</code></span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <textarea
            className="edit-textarea"
            value={editValue}
            onChange={e => onChangeValue(e.target.value)}
            autoFocus
            spellCheck={false}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

function JsonModal({ tableData, onClose }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(tableData, null, 2)

  async function copyJson() {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Export JSON <span className="meta-badge">{tableData.length} rows</span></span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${copied ? 'btn-success' : 'btn-primary'}`} onClick={copyJson}>
              {copied ? '✓ Copied!' : '⎘ Copy JSON'}
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <pre className="json-pre">{json}</pre>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TableView({ data, columns, filename, onNewConversion }) {
  const [tableData, setTableData] = useState(data)
  const [search,    setSearch]    = useState('')
  const [sortCol,   setSortCol]   = useState(-1)
  const [sortDir,   setSortDir]   = useState(1)
  const [editCell,  setEditCell]  = useState(null)   // { originalIdx, col, value }
  const [editValue, setEditValue] = useState('')
  const [jsonModal, setJsonModal] = useState(false)
  const [copiedKey, setCopiedKey] = useState(null)

  // ── Computed display rows ────────────────────────────────────────────────
  const displayRows = useMemo(() => {
    const q = search.trim().toLowerCase()

    // 1. attach originalIdx, filter by search
    let rows = tableData.map((row, originalIdx) => ({ row, originalIdx }))
    if (q) {
      rows = rows.filter(({ row }) =>
        columns.some(col => cellStr(row[col]).toLowerCase().includes(q))
      )
    }

    // 2. sort
    if (sortCol >= 0) {
      const col = columns[sortCol]
      rows = [...rows].sort((a, b) => {
        const av = cellStr(a.row[col])
        const bv = cellStr(b.row[col])
        const an = parseFloat(av), bn = parseFloat(bv)
        if (!isNaN(an) && !isNaN(bn)) return (an - bn) * sortDir
        return av.localeCompare(bv) * sortDir
      })
    }

    return rows
  }, [tableData, search, sortCol, sortDir, columns])

  // ── Sort ─────────────────────────────────────────────────────────────────
  function handleSort(colIdx) {
    if (sortCol === colIdx) setSortDir(d => -d)
    else { setSortCol(colIdx); setSortDir(1) }
  }

  function thClass(i) {
    if (sortCol !== i) return 'sortable'
    return 'sortable ' + (sortDir === 1 ? 'sort-asc' : 'sort-desc')
  }

  // ── Copy ─────────────────────────────────────────────────────────────────
  const copyValue = useCallback(async (key, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch (_) {}
  }, [])

  // ── Delete ───────────────────────────────────────────────────────────────
  function deleteRow(originalIdx) {
    setTableData(prev => prev.filter((_, i) => i !== originalIdx))
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function openEdit(originalIdx, col, value) {
    const str = typeof value === 'object' && value !== null
      ? JSON.stringify(value, null, 2)
      : cellStr(value)
    setEditCell({ originalIdx, col })
    setEditValue(str)
  }

  function saveEdit() {
    let parsed
    try { parsed = JSON.parse(editValue) } catch { parsed = editValue }
    setTableData(prev =>
      prev.map((r, i) =>
        i === editCell.originalIdx ? { ...r, [editCell.col]: parsed } : r
      )
    )
    setEditCell(null)
  }

  // ── Export buttons (reused in header + footer) ───────────────────────────
  const ExportButtons = () => (
    <>
      <button className="btn btn-export"                   onClick={() => exportCsv(tableData, columns)}>Download CSV</button>
      <button className="btn btn-export btn-export--excel" onClick={() => exportExcel(tableData, columns)}>Download Excel</button>
      <button className="btn btn-export btn-export--json"  onClick={() => setJsonModal(true)}>Export JSON</button>
    </>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sticky header ── */}
      <header className="site-header site-header--table">
        <div className="header-inner header-inner--spread">
          <div className="header-left">
            <button className="btn btn-secondary" onClick={onNewConversion}>← New Conversion</button>
            {filename && <span className="filename-badge">{filename}</span>}
          </div>
          <div className="export-bar"><ExportButtons /></div>
        </div>
      </header>

      <main className="container container--wide">
        {/* ── Meta row ── */}
        <div className="table-meta">
          <h1 className="table-title">Preview</h1>
          <span className="meta-badge">{tableData.length} row{tableData.length !== 1 ? 's' : ''}</span>
          <span className="meta-badge">{columns.length} column{columns.length !== 1 ? 's' : ''}</span>
          {search && <span className="meta-badge meta-badge--filter">{displayRows.length} match{displayRows.length !== 1 ? 'es' : ''}</span>}
        </div>

        {/* ── Search bar ── */}
        <div className="search-bar-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-bar"
            type="text"
            placeholder="Search all columns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} title="Clear">✕</button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="table-wrapper">
          <table id="dataTable">
            <thead>
              <tr>
                <th className="row-num">#</th>
                <th className="delete-col" title="Delete row" />
                {columns.map((col, i) => (
                  <th key={col} data-col={i} className={thClass(i)} title="Click to sort" onClick={() => handleSort(i)}>
                    {col} <span className="sort-icon">↕</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px' }}>
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                displayRows.map(({ row, originalIdx }, displayIdx) => (
                  <tr key={originalIdx}>
                    <td className="row-num">{displayIdx + 1}</td>
                    <td className="delete-col">
                      <button
                        className="btn-delete"
                        title="Delete row"
                        onClick={() => deleteRow(originalIdx)}
                      >🗑</button>
                    </td>
                    {columns.map(col => (
                      <td key={col} className="data-cell">
                        <CellContent
                          value={row[col]}
                          rowKey={originalIdx}
                          colKey={col}
                          onCopy={copyValue}
                          copiedKey={copiedKey}
                        />
                        <button
                          className="cell-edit-icon"
                          title="Edit cell"
                          onClick={() => openEdit(originalIdx, col, row[col])}
                        >✏</button>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer export ── */}
        <div className="export-footer">
          <ExportButtons />
        </div>
      </main>

      <footer className="site-footer">
        <p>Json2Excel — Everything runs in your browser. No data is uploaded to any server.</p>
      </footer>

      {/* ── Edit modal ── */}
      {editCell && (
        <EditModal
          editCell={editCell}
          editValue={editValue}
          onChangeValue={setEditValue}
          onSave={saveEdit}
          onCancel={() => setEditCell(null)}
        />
      )}

      {/* ── JSON export modal ── */}
      {jsonModal && (
        <JsonModal
          tableData={tableData}
          onClose={() => setJsonModal(false)}
        />
      )}
    </>
  )
}
