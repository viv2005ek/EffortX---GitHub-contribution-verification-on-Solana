const { parseGitHubUrl } = require('../utils/githubParser');
const { fetchCommitData, fetchPullRequestData, preprocessData } = require('../services/githubService');
const { analyzeContribution } = require('../services/geminiService');
const { calculateRewardCoins } = require('../services/scoringService');
const { getRedisClient } = require('../utils/redisClient');
const axios = require('axios');

/**
 * Main analysis endpoint controller
 */
const analyze = async (req, res) => {
  try {
    const { githubUrl } = req.body;

    if (!githubUrl) {
      return res.status(400).json({
        success: false,
        error: 'githubUrl is required'
      });
    }

    // STEP 1: Parse URL
    const parsed = parseGitHubUrl(githubUrl);
    const { owner, repo, type } = parsed;

    // STEP 2: Fetch Data
    let rawData;
    if (type === 'commit') {
      rawData = await fetchCommitData(owner, repo, parsed.hash);
    } else {
      rawData = await fetchPullRequestData(owner, repo, parsed.pullNumber);
    }

    // STEP 3: Preprocess for AI
    const processedData = preprocessData(rawData, type);

    // STEP 4: AI Analysis
    const aiResult = await analyzeContribution(processedData);

    // STEP 5: Calculate Rewards
    const rewardCoins = calculateRewardCoins(aiResult.effortScore);

    // STEP 6: Format Final Response
    const responseData = {
      type: type,
      repository: repo,
      author: rawData.author,
      commitHash: parsed.hash || null,
      pullNumber: parsed.pullNumber || null,
      commitMessage: rawData.message || rawData.title,
      effortScore: aiResult.effortScore,
      rewardCoins: rewardCoins,
      contributionCategory: aiResult.contributionCategory,
      complexity: aiResult.complexity,
      summary: aiResult.summary,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      spamProbability: aiResult.spamProbability,
      aiConfidence: aiResult.aiConfidence,
      analyzedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Analysis Controller Error:', error);
    
    let statusCode = 500;
    if (error.message.includes('Invalid GitHub URL') || error.message.includes('Unsupported')) {
      statusCode = 400;
    } else if (error.message.includes('Not Found')) {
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Health check
 */
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'EffortX Off-chain Analyzer'
  });
};

module.exports = {
  analyze,
  healthCheck
};

/**
 * Post report as a comment to GitHub
 */
const commentOnGithub = async (req, res) => {
  try {
    const { githubUrl, reportMarkdown, githubUsername } = req.body;

    if (!githubUrl || !reportMarkdown || !githubUsername) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const redisClient = await getRedisClient();
    if (!redisClient) {
      return res.status(500).json({ success: false, error: 'Redis client not initialized' });
    }

    const accessToken = await redisClient.get(`github_token:${githubUsername}`);
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'User is not authenticated with GitHub or token expired' });
    }

    const parsed = parseGitHubUrl(githubUrl);
    const { owner, repo, type } = parsed;

    let url;
    if (type === 'commit') {
      url = `https://api.github.com/repos/${owner}/${repo}/commits/${parsed.hash}/comments`;
    } else {
      url = `https://api.github.com/repos/${owner}/${repo}/issues/${parsed.pullNumber}/comments`;
    }

    const response = await axios.post(url, {
      body: reportMarkdown
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json({ success: true, commentUrl: response.data.html_url });
  } catch (error) {
    console.error('GitHub Comment Error:', error.response?.data || error.message);
    
    if (error.response) {
      const status = error.response.status;
      const ghMessage = error.response.data?.message || '';

      if (status === 401) {
        // The token is invalid or expired. Delete it from Redis so it's not reused.
        try {
          const { githubUsername } = req.body;
          const redisClient = await getRedisClient();
          if (redisClient) {
            await redisClient.del(`github_token:${githubUsername}`);
          }
        } catch (e) {
          console.error('Failed to delete expired token from Redis:', e);
        }
        return res.status(401).json({ success: false, error: 'GitHub authorization expired or revoked', errorType: 'AUTH_REQUIRED' });
      }

      if (status === 403 || status === 404) {
        return res.status(400).json({
          success: false,
          error: `GitHub App Permission Error (${status}): Ensure the app is installed on the repository owner's account and has 'Read & write' permissions for 'Pull requests', 'Issues', and 'Contents'. GitHub says: ${ghMessage}`
        });
      }
    }

    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Failed to post comment to GitHub due to an internal error' 
    });
  }
};

module.exports = {
  analyze,
  healthCheck,
  commentOnGithub
};
