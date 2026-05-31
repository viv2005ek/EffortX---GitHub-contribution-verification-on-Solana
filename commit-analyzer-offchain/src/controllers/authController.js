const axios = require('axios');
const { getRedisClient } = require('../utils/redisClient');


exports.getGithubAuthUrl = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ success: false, error: 'Server misconfiguration: GitHub Client ID missing' });
  }

  // The redirect_uri is optional if configured in the GitHub OAuth App, 
  // For GitHub Apps, scopes are defined in the App settings, not in the URL
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}`;
  res.json({ success: true, url });
};

exports.githubAuth = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET in .env');
      return res.status(500).json({ success: false, error: 'Server misconfiguration: GitHub OAuth credentials missing' });
    }

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'Failed to retrieve access token from GitHub', details: tokenResponse.data });
    }

    // Fetch user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const username = userResponse.data.login;

    if (!username) {
      return res.status(400).json({ success: false, error: 'Failed to retrieve GitHub username' });
    }

    // Store token in Redis mapped to the username
    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        // Store for 30 days (or adjust as needed)
        const expirationSeconds = 60 * 60 * 24 * 30;
        await redisClient.setEx(`github_token:${username}`, expirationSeconds, accessToken);
      } catch (redisErr) {
        console.error('Failed to store token in Redis:', redisErr.message);
        // We still continue even if Redis fails, but log it
      }
    } else {
      console.warn('Redis client not initialized, token not stored');
    }

    res.json({ success: true, username: username });
  } catch (error) {
    console.error('GitHub Auth Error:', error.message);
    res.status(500).json({ success: false, error: 'Authentication failed', details: error.message });
  }
};

exports.checkGithubStatus = async (req, res) => {
  try {
    const { username } = req.params;
    const redisClient = getRedisClient();
    if (!redisClient) {
      return res.json({ authenticated: false });
    }
    const token = await redisClient.get(`github_token:${username}`);
    res.json({ authenticated: !!token });
  } catch (error) {
    res.json({ authenticated: false });
  }
};
