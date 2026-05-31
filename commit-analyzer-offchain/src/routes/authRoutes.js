const express = require('express');
const { githubAuth, getGithubAuthUrl } = require('../controllers/authController');

const router = express.Router();

router.get('/github/url', getGithubAuthUrl);
router.post('/github', githubAuth);

module.exports = router;
