import { useState, useRef } from 'react'
import { parseText, parseFile } from '../utils/parsers'

export default function InputView({ onConverted }) {
  const [error,       setError]       = useState('')
  const [formError,   setFormError]   = useState('')
  const [filename,    setFilename]    = useState('')
  const [hasFile,     setHasFile]     = useState(false)
  const [isDragOver,  setIsDragOver]  = useState(false)
  const [textDimmed,  setTextDimmed]  = useState(false)
  const [fileDimmed,  setFileDimmed]  = useState(false)
  const [converting,  setConverting]  = useState(false)

  const fileInputRef = useRef(null)
  const jsonTextRef  = useRef(null)

  // ── Drag-and-drop ────────────────────────────────────────────────────────
  function handleDragOver(e)  { e.preventDefault(); setIsDragOver(true) }
  function handleDragLeave()  { setIsDragOver(false) }
  function handleDrop(e) {
    e.preventDefault(); setIsDragOver(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) assignFile(f)
  }

  function assignFile(file) {
    const dt = new DataTransfer()
    dt.items.add(file)
    fileInputRef.current.files = dt.files
    setFilename(file.name); setHasFile(true)
    setTextDimmed(true);    setFileDimmed(false)
  }

  function handleFileChange() {
    const f = fileInputRef.current.files[0]
    if (f) { setFilename(f.name); setHasFile(true); setTextDimmed(true); setFileDimmed(false) }
    else   { setFilename('');     setHasFile(false); setTextDimmed(false); setFileDimmed(false) }
  }

  function handleTextInput() {
    const val = jsonTextRef.current.value.trim()
    setFileDimmed(!!val); setTextDimmed(false); setFormError('')
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const hasFileSelected = fileInputRef.current.files.length > 0
    const hasText         = jsonTextRef.current.value.trim().length > 0

    if (!hasFileSelected && !hasText) {
      setFormError('Please paste JSON text or select a file before converting.')
      return
    }

    setFormError(''); setError(''); setConverting(true)

    try {
      const result = hasFileSelected
        ? await parseFile(fileInputRef.current.files[0])
        : parseText(jsonTextRef.current.value)

      if (result.error) { setError(result.error); return }
      onConverted(result.data, result.columns, hasFileSelected ? fileInputRef.current.files[0].name : null)
    } catch (err) {
      setError(err.message || 'Unexpected error')
    } finally {
      setConverting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⇄</span>
            <span className="logo-text">Json<strong>2</strong>Excel</span>
          </div>
          <p className="tagline">Paste or upload JSON, JS, CSV, or Excel — preview and export instantly</p>
        </div>
      </header>

      <main className="container">
        {error && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Paste JSON ── */}
          <section className={`card${textDimmed ? ' dimmed' : ''}`}>
            <div className="card-header">
              <span className="step-badge">1</span>
              <h2>Paste JSON</h2>
            </div>
            <textarea
              ref={jsonTextRef}
              id="jsonText"
              rows={10}
              placeholder={
                'Paste your JSON here, e.g.:\n' +
                '[\n' +
                '  { "name": "Alice", "age": 30, "city": "London" },\n' +
                '  { "name": "Bob",   "age": 25, "city": "Paris"  }\n' +
                ']'
              }
              spellCheck={false}
              autoComplete="off"
              onInput={handleTextInput}
            />
            <p className="hint">
              Accepts an array of objects <code>[{'{'} ... {'}'}]</code> or a single object <code>{'{'} ... {'}'}</code>
            </p>
          </section>

          <div className="divider"><span>or</span></div>

          {/* ── Upload file ── */}
          <section className={`card${fileDimmed ? ' dimmed' : ''}`}>
            <div className="card-header">
              <span className="step-badge">2</span>
              <h2>Upload a File</h2>
            </div>
            <label
              className={`file-drop${isDragOver ? ' drag-over' : ''}${hasFile ? ' has-file' : ''}`}
              id="fileDrop"
              htmlFor="fileInput"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="fileInput"
                accept=".json,.js,.xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              <div className="file-drop-inner">
                <span className="file-drop-icon">↑</span>
                <span id="fileLabel" className="file-drop-label">
                  {hasFile ? filename : 'Drop file here or click to browse'}
                </span>
              </div>
            </label>
            <p className="hint">
              Supported formats: <code>.json</code>&nbsp;&nbsp;<code>.js</code>&nbsp;&nbsp;
              <code>.xlsx</code>&nbsp;&nbsp;<code>.xls</code>&nbsp;&nbsp;<code>.csv</code>
            </p>
            <div className="format-pills">
              <span className="pill">JSON file</span>
              <span className="pill">JS module (exports array)</span>
              <span className="pill">Excel (.xlsx / .xls)</span>
              <span className="pill">CSV</span>
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={converting}>
              <span>{converting ? 'Converting…' : 'Convert & Preview'}</span>
              {!converting && <span className="btn-arrow">→</span>}
            </button>
            {formError && (
              <span className="form-error" aria-live="polite">{formError}</span>
            )}
          </div>

        </form>
      </main>

      <footer className="site-footer">
        <p>Json2Excel — Everything runs in your browser. No data is uploaded to any server.</p>
      </footer>
    </>
  )
}
