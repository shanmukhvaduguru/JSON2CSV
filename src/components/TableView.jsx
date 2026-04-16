import { useState } from 'react'
import { exportCsv, exportExcel } from '../utils/exporters'

export default function TableView({ data, columns, filename, onNewConversion }) {
  const [rows,    setRows]    = useState(data)
  const [sortCol, setSortCol] = useState(-1)
  const [sortDir, setSortDir] = useState(1)   // 1 = asc, -1 = desc

  function handleSort(colIdx) {
    const newDir = sortCol === colIdx ? -sortDir : 1
    setSortCol(colIdx); setSortDir(newDir)

    const col    = columns[colIdx]
    const sorted = [...data].sort((a, b) => {
      const av = String(a[col] ?? '').trim()
      const bv = String(b[col] ?? '').trim()
      const an = parseFloat(av), bn = parseFloat(bv)
      if (!isNaN(an) && !isNaN(bn)) return (an - bn) * newDir
      return av.localeCompare(bv) * newDir
    })
    setRows(sorted)
  }

  function thClass(i) {
    if (sortCol !== i) return 'sortable'
    return 'sortable ' + (sortDir === 1 ? 'sort-asc' : 'sort-desc')
  }

  const ExportButtons = () => (
    <>
      <button className="btn btn-export"              onClick={() => exportCsv(data, columns)}>
        Download CSV
      </button>
      <button className="btn btn-export btn-export--excel" onClick={() => exportExcel(data, columns)}>
        Download Excel (.xlsx)
      </button>
    </>
  )

  return (
    <>
      <header className="site-header site-header--table">
        <div className="header-inner header-inner--spread">
          <div className="header-left">
            <button className="btn btn-secondary" onClick={onNewConversion}>← New Conversion</button>
            {filename && <span className="filename-badge">{filename}</span>}
          </div>
          <div className="export-bar">
            <ExportButtons />
          </div>
        </div>
      </header>

      <main className="container container--wide">
        <div className="table-meta">
          <h1 className="table-title">Preview</h1>
          <span className="meta-badge">{data.length} row{data.length !== 1 ? 's' : ''}</span>
          <span className="meta-badge">{columns.length} column{columns.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="table-wrapper">
          <table id="dataTable">
            <thead>
              <tr>
                <th className="row-num">#</th>
                {columns.map((col, i) => (
                  <th
                    key={col}
                    data-col={i}
                    className={thClass(i)}
                    title="Click to sort"
                    onClick={() => handleSort(i)}
                  >
                    {col} <span className="sort-icon">↕</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="row-num">{idx + 1}</td>
                  {columns.map(col => (
                    <td key={col}>
                      {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="export-footer">
          <ExportButtons />
        </div>
      </main>

      <footer className="site-footer">
        <p>Json2Excel — Everything runs in your browser. No data is uploaded to any server.</p>
      </footer>
    </>
  )
}
