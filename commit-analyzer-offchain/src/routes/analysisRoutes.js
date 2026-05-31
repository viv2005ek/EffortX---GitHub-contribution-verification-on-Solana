const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// POST /analyze - The main endpoint
router.post('/analyze', analysisController.analyze);

// GET /health - Health check
router.get('/health', analysisController.healthCheck);

// POST /comment - Post a comment to GitHub
router.post('/comment', analysisController.commentOnGithub);

module.exports = router;
