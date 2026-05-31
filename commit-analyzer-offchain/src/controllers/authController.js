const axios = require('axios');


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

    res.json({ success: true, username: username });
  } catch (error) {
    console.error('GitHub Auth Error:', error.message);
    res.status(500).json({ success: false, error: 'Authentication failed', details: error.message });
  }
};
