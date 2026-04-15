const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const error = req.query.error || null;
  res.render('index', { error });
});

module.exports = router;
