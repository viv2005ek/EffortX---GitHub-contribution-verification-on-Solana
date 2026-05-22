const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const DAPPIER_API_KEY = process.env.DAPPIER_API_KEY;
// Semantic to Dappier Model ID Mapping
const modelIdMap = {
  'real-time-search': 'am_01j06ytn18ejftedz6dyhz2b15',
  'research-papers': 'am_01j0rzq4tvfscrgzwac7jv6dr2',
  'stock-market': 'am_01j749h8pbf7ns8r1bq9s2evrh',
  'benzinga': 'dm_01jmxn1a9tem8bq1nzbzjck8c4',
  'sports-news': 'dm_01j0pb465keqmatq9k83dthx34',
  'lifestyle-news': 'dm_01j0q82s4bfjmsqkhs3ywm3x6y',
  'iheartcats': 'dm_01j1sza0h7ekhaecys2p3y0vmj',
  'iheartdogs': 'dm_01j1sz8t3qe6v9g8ad102kvmqn',
  'cafemom-parenting': 'dm_01j1szcafemomparenting',

  // Direct mappings
  'am_01j06ytn18ejftedz6dyhz2b15': 'am_01j06ytn18ejftedz6dyhz2b15',
  'am_01j0rzq4tvfscrgzwac7jv6dr2': 'am_01j0rzq4tvfscrgzwac7jv6dr2',
  'am_01j749h8pbf7ns8r1bq9s2evrh': 'am_01j749h8pbf7ns8r1bq9s2evrh',
  'dm_01jmxn1a9tem8bq1nzbzjck8c4': 'dm_01jmxn1a9tem8bq1nzbzjck8c4',
  'dm_01j0pb465keqmatq9k83dthx34': 'dm_01j0pb465keqmatq9k83dthx34',
  'dm_01j0q82s4bfjmsqkhs3ywm3x6y': 'dm_01j0q82s4bfjmsqkhs3ywm3x6y',
  'dm_01j1sza0h7ekhaecys2p3y0vmj': 'dm_01j1sza0h7ekhaecys2p3y0vmj',
  'dm_01j1sz8t3qe6v9g8ad102kvmqn': 'dm_01j1sz8t3qe6v9g8ad102kvmqn',
  'dm_01j1szcafemomparenting': 'dm_01j1szcafemomparenting'
};

// Fixed ECOIN costs per model
const MODEL_COSTS = {
  'real-time-search': 0,
  'am_01j06ytn18ejftedz6dyhz2b15': 0,

  'research-papers': 3,
  'am_01j0rzq4tvfscrgzwac7jv6dr2': 3,

  'stock-market': 7,
  'am_01j749h8pbf7ns8r1bq9s2evrh': 7,

  'benzinga': 20,
  'dm_01jmxn1a9tem8bq1nzbzjck8c4': 20,

  'sports-news': 10,
  'dm_01j0pb465keqmatq9k83dthx34': 10,

  'lifestyle-news': 10,
  'dm_01j0q82s4bfjmsqkhs3ywm3x6y': 10,

  'iheartcats': 1,
  'dm_01j1sza0h7ekhaecys2p3y0vmj': 1,

  'iheartdogs': 1,
  'dm_01j1sz8t3qe6v9g8ad102kvmqn': 1,

  'cafemom-parenting': 1,
  'dm_01j1szcafemomparenting': 1
};

exports.estimate = async (req, res) => {
  try {
    const { messages, modelId } = req.body;

    // If the frontend requests an estimate for a model with a fixed cost
    if (modelId && MODEL_COSTS[modelId] !== undefined) {
      return res.json({
        success: true,
        estimatedTokens: 0,
        ecoinCost: MODEL_COSTS[modelId]
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Invalid messages array' });
    }

    // MVP estimation logic based on character count
    const totalChars = messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0);
    const estimatedTokens = Math.ceil(totalChars / 4); // rough estimate: 1 token = 4 chars

    // MVP pricing: 1 ECOIN per 50 tokens, minimum 2 ECOIN
    const ecoinCost = Math.max(2, Math.ceil(estimatedTokens / 50));

    return res.json({
      success: true,
      estimatedTokens,
      ecoinCost
    });
  } catch (error) {
    console.error('Estimate error:', error);
    return res.status(500).json({ success: false, error: 'Failed to estimate token usage' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { messages, walletAddress, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Invalid messages array' });
    }

    // Initialize Gemini model
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Convert messages to Gemini format
    // Assuming messages is [{role: "user", content: "..."}, {role: "assistant", content: "..."}]
    const formattedHistory = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = geminiModel.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage([{ text: lastMessage }]);
    const responseText = result.response.text();

    return res.json({
      success: true,
      reply: responseText
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate AI response' });
  }
};

exports.dappier = async (req, res) => {
  try {
    const { modelId, query, walletAddress } = req.body;

    if (!modelId) {
      return res.status(400).json({ success: false, error: 'Model ID is required' });
    }
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }

    // Resolve model ID (supports both friendly names and raw IDs)
    const actualModelId = modelIdMap[modelId];
    if (!actualModelId) {
      return res.status(400).json({ success: false, error: `Invalid or unsupported Dappier model: ${modelId}` });
    }

    console.log(`[Playground Audit] Wallet ${walletAddress} querying Dappier model: ${actualModelId} (${modelId})`);

    const apiKey = process.env.DAPPIER_API_KEY;
    if (!apiKey) {
      console.error('DAPPIER_API_KEY environment variable is not configured');
      return res.status(500).json({ success: false, error: 'Dappier API key not configured on backend' });
    }

    const url = `https://api.dappier.com/app/aimodel/${actualModelId}`;

    const response = await axios.post(
      url,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${DAPPIER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // The response is formatted as { message: "AI response" }
    const reply = response.data.message || response.data.reply || JSON.stringify(response.data);

    return res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error('Dappier API proxy error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to call Dappier API';
    return res.status(error.response?.status || 500).json({
      success: false,
      error: errorMessage
    });
  }
};
