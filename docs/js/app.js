/* Json2Excel — browser-only single-page app */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  var _data     = [];
  var _columns  = [];
  var _filename = null;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  var inputView  = document.getElementById('inputView');
  var tableView  = document.getElementById('tableView');
  var form       = document.getElementById('convertForm');
  var fileInput  = document.getElementById('fileInput');
  var fileDrop   = document.getElementById('fileDrop');
  var fileLabel  = document.getElementById('fileLabel');
  var jsonText   = document.getElementById('jsonText');
  var textCard   = document.getElementById('textCard');
  var fileCard   = document.getElementById('fileCard');
  var formError  = document.getElementById('formError');
  var alertError = document.getElementById('alertError');
  var alertMsg   = document.getElementById('alertMsg');

  // ── View switching ─────────────────────────────────────────────────────────
  function showInputView() {
    inputView.style.display = '';
    tableView.style.display = 'none';
    document.title = 'Json2Excel — Convert JSON to Excel';
  }

  function showTableView() {
    inputView.style.display = 'none';
    tableView.style.display = '';
    document.title = 'Json2Excel — Preview';
  }

  // ── Error helpers ──────────────────────────────────────────────────────────
  function showAlert(msg) {
    alertError.style.display = '';
    alertMsg.textContent = msg;
  }

  function hideAlert() {
    alertError.style.display = 'none';
  }

  function showFormError(msg) {
    formError.textContent = msg;
  }

  function clearFormError() {
    formError.textContent = '';
  }

  // ── File-drop zone ─────────────────────────────────────────────────────────
  fileDrop.addEventListener('dragover', function (e) {
    e.preventDefault();
    fileDrop.classList.add('drag-over');
  });

  fileDrop.addEventListener('dragleave', function () {
    fileDrop.classList.remove('drag-over');
  });

  fileDrop.addEventListener('drop', function (e) {
    e.preventDefault();
    fileDrop.classList.remove('drag-over');
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length > 0) {
      var dt = new DataTransfer();
      dt.items.add(files[0]);
      fileInput.files = dt.files;
      setFileLabel(files[0].name);
      dimTextarea();
    }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      setFileLabel(fileInput.files[0].name);
      dimTextarea();
    } else {
      resetFileLabel();
      undimAll();
    }
  });

  jsonText.addEventListener('input', function () {
    if (jsonText.value.trim()) dimFileZone();
    else undimAll();
    clearFormError();
  });

  // ── Form submit ────────────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var hasFile = fileInput.files.length > 0;
    var hasText = jsonText.value.trim().length > 0;

    if (!hasFile && !hasText) {
      showFormError('Please paste JSON text or select a file before converting.');
      return;
    }

    clearFormError();
    hideAlert();

    if (hasFile) {
      _filename = fileInput.files[0].name;
      parseFile(fileInput.files[0], function (result) {
        if (result.error) { showAlert(result.error); return; }
        _data    = result.data;
        _columns = result.columns;
        renderTable();
        showTableView();
      });
    } else {
      var result = parseText(jsonText.value);
      if (result.error) { showAlert(result.error); return; }
      _data     = result.data;
      _columns  = result.columns;
      _filename = null;
      renderTable();
      showTableView();
    }
  });

  // ── Parsers ────────────────────────────────────────────────────────────────

  function parseText(text) {
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { return { error: 'Invalid JSON: ' + e.message }; }
    return normalise(parsed);
  }

  function parseFile(file, cb) {
    var ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'json') {
      readText(file, function (text) { cb(parseText(text)); });
      return;
    }

    if (ext === 'js') {
      readText(file, function (text) { cb(parseJs(text)); });
      return;
    }

    if (ext === 'csv') {
      readText(file, function (text) { cb(parseCsv(text)); });
      return;
    }

    if (ext === 'xlsx' || ext === 'xls') {
      readBinary(file, function (buf) { cb(parseExcel(buf)); });
      return;
    }

    cb({ error: 'Unsupported file type. Supported: .json .js .xlsx .xls .csv' });
  }

  function parseJs(text) {
    // Three-pass regex — same logic as the Node.js server-side parser
    var patterns = [
      /module\.exports\s*=\s*(\[[\s\S]*?\])\s*;?\s*$/m,
      /export\s+default\s+(\[[\s\S]*?\])\s*;?\s*$/m,
      /(?:const|let|var)\s+\w+\s*=\s*(\[[\s\S]*?\])\s*;/,
      /module\.exports\s*=\s*(\{[\s\S]*?\})\s*;?\s*$/m,
      /export\s+default\s+(\{[\s\S]*?\})\s*;?\s*$/m,
    ];

    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m) {
        try { return normalise(JSON.parse(m[1])); } catch (e) { /* try next */ }
      }
    }

    // Last resort: find any JSON array in the content
    var arrMatch = text.match(/(\[[\s\S]*\])/);
    if (arrMatch) {
      try { return normalise(JSON.parse(arrMatch[1])); } catch (e) {}
    }

    return { error: 'Could not extract data from .js file. Ensure it exports an array of objects via module.exports or export default.' };
  }

  function parseCsv(text) {
    if (typeof Papa === 'undefined') {
      return { error: 'CSV parser not loaded. Please check your internet connection.' };
    }
    var result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true, dynamicTyping: false });
    if (result.errors.length > 0 && result.data.length === 0) {
      return { error: 'CSV parse error: ' + result.errors[0].message };
    }
    return normalise(result.data);
  }

  function parseExcel(buf) {
    if (typeof XLSX === 'undefined') {
      return { error: 'Excel parser not loaded. Please check your internet connection.' };
    }
    try {
      var wb   = XLSX.read(buf, { type: 'array' });
      var ws   = wb.Sheets[wb.SheetNames[0]];
      var data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      return normalise(data);
    } catch (e) {
      return { error: 'Failed to read Excel file: ' + e.message };
    }
  }

  function normalise(parsed) {
    var rows;
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && typeof parsed === 'object') {
      rows = [parsed];
    } else {
      return { error: 'Input must be a JSON object or array of objects.' };
    }

    var valid = rows.filter(function (r) {
      return r && typeof r === 'object' && !Array.isArray(r);
    });

    if (valid.length === 0) {
      return { error: 'No valid objects found in input.' };
    }

    var colSet = [];
    valid.forEach(function (row) {
      Object.keys(row).forEach(function (k) {
        if (colSet.indexOf(k) === -1) colSet.push(k);
      });
    });

    return { data: valid, columns: colSet, error: null };
  }

  // ── File reading utilities ─────────────────────────────────────────────────
  function readText(file, cb) {
    var reader = new FileReader();
    reader.onload  = function (e) { cb(e.target.result); };
    reader.onerror = function ()  { cb(''); };
    reader.readAsText(file, 'UTF-8');
  }

  function readBinary(file, cb) {
    var reader = new FileReader();
    reader.onload  = function (e) { cb(new Uint8Array(e.target.result)); };
    reader.onerror = function ()  { cb(null); };
    reader.readAsArrayBuffer(file);
  }

  // ── Table rendering ────────────────────────────────────────────────────────
  function renderTable() {
    // Meta badges
    document.getElementById('rowCount').textContent =
      _data.length + ' row' + (_data.length !== 1 ? 's' : '');
    document.getElementById('colCount').textContent =
      _columns.length + ' column' + (_columns.length !== 1 ? 's' : '');

    // Filename badge
    var badge = document.getElementById('filenameBadge');
    if (_filename) {
      badge.textContent = _filename;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }

    // Headers
    var thead = document.querySelector('#dataTable thead tr');
    thead.innerHTML = '<th class="row-num">#</th>';
    _columns.forEach(function (col, i) {
      var th = document.createElement('th');
      th.className = 'sortable';
      th.setAttribute('data-col', i);
      th.title = 'Click to sort';
      th.innerHTML = col + ' <span class="sort-icon">↕</span>';
      thead.appendChild(th);
    });

    // Rows
    var tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    _data.forEach(function (row, idx) {
      var tr = document.createElement('tr');
      var numTd = document.createElement('td');
      numTd.className = 'row-num';
      numTd.textContent = idx + 1;
      tr.appendChild(numTd);
      _columns.forEach(function (col) {
        var td = document.createElement('td');
        var v = row[col];
        td.textContent = (v !== undefined && v !== null) ? v : '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    initSort();
  }

  // ── Client-side sort ───────────────────────────────────────────────────────
  function initSort() {
    var table   = document.getElementById('dataTable');
    var tbody   = table.querySelector('tbody');
    var headers = table.querySelectorAll('th.sortable');
    var sortCol = -1, sortDir = 1;

    headers.forEach(function (th) {
      th.addEventListener('click', function () {
        var col = parseInt(th.getAttribute('data-col'), 10);
        if (sortCol === col) sortDir = -sortDir;
        else { sortCol = col; sortDir = 1; }

        headers.forEach(function (h) { h.classList.remove('sort-asc', 'sort-desc'); });
        th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');

        var rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort(function (a, b) {
          var aVal = (a.querySelectorAll('td')[col + 1] || {}).textContent || '';
          var bVal = (b.querySelectorAll('td')[col + 1] || {}).textContent || '';
          aVal = aVal.trim(); bVal = bVal.trim();
          var aNum = parseFloat(aVal), bNum = parseFloat(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) return (aNum - bNum) * sortDir;
          return aVal.localeCompare(bVal) * sortDir;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  function exportCsv() {
    if (!_data.length) return;
    var BOM = '\uFEFF';
    function esc(v) {
      var s = String(v === null || v === undefined ? '' : v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var rows = [_columns.map(esc).join(',')].concat(
      _data.map(function (row) {
        return _columns.map(function (c) { return esc(row[c] !== undefined ? row[c] : ''); }).join(',');
      })
    );
    download(new Blob([BOM + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), 'export.csv');
  }

  function exportExcel() {
    if (!_data.length || typeof XLSX === 'undefined') return;
    var aoa = [_columns].concat(
      _data.map(function (row) {
        return _columns.map(function (c) { return row[c] !== undefined ? row[c] : ''; });
      })
    );
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = _columns.map(function (col) {
      var max = col.length;
      _data.forEach(function (row) {
        var v = row[col];
        var len = (v !== undefined && v !== null) ? String(v).length : 0;
        if (len > max) max = len;
      });
      return { wch: Math.min(max + 2, 50) };
    });
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    var buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      'export.xlsx'
    );
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Wire up export buttons ─────────────────────────────────────────────────
  document.querySelectorAll('[data-export="csv"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); exportCsv(); });
  });
  document.querySelectorAll('[data-export="excel"]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); exportExcel(); });
  });

  // ── New Conversion button ──────────────────────────────────────────────────
  document.getElementById('newConversionBtn').addEventListener('click', function () {
    form.reset();
    resetFileLabel();
    undimAll();
    clearFormError();
    hideAlert();
    showInputView();
  });

  // ── UI helpers ─────────────────────────────────────────────────────────────
  function setFileLabel(name) {
    fileLabel.textContent = name;
    fileDrop.classList.add('has-file');
  }

  function resetFileLabel() {
    fileLabel.textContent = 'Drop file here or click to browse';
    fileDrop.classList.remove('has-file');
  }

  function dimTextarea() {
    textCard.classList.add('dimmed');
    fileCard.classList.remove('dimmed');
  }

  function dimFileZone() {
    fileCard.classList.add('dimmed');
    textCard.classList.remove('dimmed');
  }

  function undimAll() {
    textCard.classList.remove('dimmed');
    fileCard.classList.remove('dimmed');
  }

}());
