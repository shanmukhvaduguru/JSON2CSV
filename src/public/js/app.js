/* Json2Excel — Client-side JS */

(function () {
  'use strict';

  /* -----------------------------------------------
     Input page interactions
  ----------------------------------------------- */
  const form       = document.getElementById('convertForm');
  const fileInput  = document.getElementById('fileInput');
  const fileDrop   = document.getElementById('fileDrop');
  const fileLabel  = document.getElementById('fileLabel');
  const jsonText   = document.getElementById('jsonText');
  const textCard   = document.getElementById('textCard');
  const fileCard   = document.getElementById('fileCard');
  const formError  = document.getElementById('formError');

  if (!form) {
    // We're on the table page — init table features instead
    initTablePage();
    return;
  }

  /* --- File drop zone --- */
  if (fileDrop) {
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
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        // Assign dropped files to the real input
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInput.files = dt.files;
        updateFileLabel(files[0].name);
        dimTextarea();
      }
    });
  }

  /* --- File input change --- */
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (fileInput.files.length > 0) {
        updateFileLabel(fileInput.files[0].name);
        dimTextarea();
      } else {
        resetFileLabel();
        undimAll();
      }
    });
  }

  /* --- Textarea input --- */
  if (jsonText) {
    jsonText.addEventListener('input', function () {
      if (jsonText.value.trim()) {
        dimFileZone();
      } else {
        undimAll();
      }
      clearFormError();
    });
  }

  /* --- Form submit validation --- */
  if (form) {
    form.addEventListener('submit', function (e) {
      const hasFile = fileInput && fileInput.files.length > 0;
      const hasText = jsonText && jsonText.value.trim().length > 0;
      if (!hasFile && !hasText) {
        e.preventDefault();
        showFormError('Please paste JSON text or select a file before converting.');
      }
    });
  }

  /* --- Helpers --- */
  function updateFileLabel(name) {
    if (fileLabel) {
      fileLabel.textContent = name;
      fileDrop && fileDrop.classList.add('has-file');
    }
  }

  function resetFileLabel() {
    if (fileLabel) {
      fileLabel.textContent = 'Drop file here or click to browse';
      fileDrop && fileDrop.classList.remove('has-file');
    }
  }

  function dimTextarea() {
    if (textCard) textCard.classList.add('dimmed');
    if (fileCard) fileCard.classList.remove('dimmed');
  }

  function dimFileZone() {
    if (fileCard) fileCard.classList.add('dimmed');
    if (textCard) textCard.classList.remove('dimmed');
  }

  function undimAll() {
    if (textCard) textCard.classList.remove('dimmed');
    if (fileCard) fileCard.classList.remove('dimmed');
  }

  function showFormError(msg) {
    if (formError) formError.textContent = msg;
  }

  function clearFormError() {
    if (formError) formError.textContent = '';
  }


  /* -----------------------------------------------
     Table page — client-side sort
  ----------------------------------------------- */
  function initTablePage() {
    const table = document.getElementById('dataTable');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    const headers = thead.querySelectorAll('th.sortable');
    let sortCol = -1;
    let sortDir = 1; // 1 = asc, -1 = desc

    headers.forEach(function (th) {
      th.addEventListener('click', function () {
        const col = parseInt(th.getAttribute('data-col'), 10);

        if (sortCol === col) {
          sortDir = -sortDir;
        } else {
          sortCol = col;
          sortDir = 1;
        }

        // Update header classes
        headers.forEach(function (h) {
          h.classList.remove('sort-asc', 'sort-desc');
        });
        th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');

        // Sort rows
        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.sort(function (a, b) {
          // +1 offset for the row-num column
          const aCell = a.querySelectorAll('td')[col + 1];
          const bCell = b.querySelectorAll('td')[col + 1];
          const aVal = aCell ? aCell.textContent.trim() : '';
          const bVal = bCell ? bCell.textContent.trim() : '';

          // Numeric comparison if both look like numbers
          const aNum = parseFloat(aVal);
          const bNum = parseFloat(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return (aNum - bNum) * sortDir;
          }
          return aVal.localeCompare(bVal) * sortDir;
        });

        rows.forEach(function (row) { tbody.appendChild(row); });
      });
    });
  }

})();
