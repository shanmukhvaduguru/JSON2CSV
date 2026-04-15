const express = require('express');
const multer = require('multer');
const path = require('path');
const fileParser = require('../services/fileParser');
const exporter = require('../services/exporter');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    const allowed = /\.(json|js|xlsx|xls|csv)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed: .json, .js, .xlsx, .xls, .csv`));
    }
  }
});

// POST /convert — parse input, store in session, redirect to table
router.post('/convert', upload.single('dataFile'), (req, res) => {
  let source;

  if (req.file) {
    const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();
    source = {
      type: ext,
      buffer: req.file.buffer,
      text: null,
      originalname: req.file.originalname
    };
  } else if (req.body.jsonText && req.body.jsonText.trim()) {
    source = {
      type: 'text',
      buffer: null,
      text: req.body.jsonText.trim(),
      originalname: null
    };
  } else {
    return res.redirect('/?error=' + encodeURIComponent('Please paste JSON or upload a file.'));
  }

  const result = fileParser.parse(source);

  if (result.error) {
    return res.redirect('/?error=' + encodeURIComponent(result.error));
  }

  if (result.data.length === 0) {
    return res.redirect('/?error=' + encodeURIComponent('No data rows found. The input appears to be empty.'));
  }

  req.session.tableData = {
    data: result.data,
    columns: result.columns,
    count: result.data.length,
    originalFilename: source.originalname,
    parsedAt: Date.now()
  };

  res.redirect('/table');
});

// GET /table — render preview page
router.get('/table', (req, res) => {
  if (!req.session.tableData) {
    return res.redirect('/');
  }
  const { data, columns, count, originalFilename } = req.session.tableData;
  res.render('table', { rows: data, columns, count, filename: originalFilename });
});

// GET /export/csv — stream CSV download
router.get('/export/csv', (req, res) => {
  if (!req.session.tableData) {
    return res.redirect('/');
  }
  const { data, columns } = req.session.tableData;
  const csv = exporter.toCSV(data, columns);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
  res.send(csv);
});

// GET /export/excel — stream Excel download
router.get('/export/excel', (req, res) => {
  if (!req.session.tableData) {
    return res.redirect('/');
  }
  const { data, columns } = req.session.tableData;
  const buffer = exporter.toExcel(data, columns);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="export.xlsx"');
  res.send(buffer);
});

// Handle multer file filter errors
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.redirect('/?error=' + encodeURIComponent('File too large. Maximum size is 10 MB.'));
  }
  res.redirect('/?error=' + encodeURIComponent(err.message || 'Upload error.'));
});

module.exports = router;
