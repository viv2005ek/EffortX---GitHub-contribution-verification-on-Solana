const express = require('express');
const { githubAuth, getGithubAuthUrl, checkGithubStatus } = require('../controllers/authController');

const router = express.Router();

router.get('/github/url', getGithubAuthUrl);
router.post('/github', githubAuth);
router.get('/github/status/:username', checkGithubStatus);

module.exports = router;
