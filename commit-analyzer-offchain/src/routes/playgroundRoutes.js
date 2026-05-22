const express = require('express');
const router = express.Router();
const playgroundController = require('../controllers/playgroundController');

// POST /api/playground/estimate
router.post('/estimate', playgroundController.estimate);

// POST /api/playground/chat
router.post('/chat', playgroundController.chat);

// POST /api/playground/dappier
router.post('/dappier', playgroundController.dappier);

module.exports = router;
