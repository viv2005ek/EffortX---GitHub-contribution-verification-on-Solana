import axios from 'axios';

const api = axios.create({
  baseURL: 'https://effortx-commit-analyzer.vercel.app/api',
  // baseURL: 'http://localhost:5000/api',
});

export const analyzeCommit = async (githubUrl) => {
  const response = await api.post('/analyze', { githubUrl });
  return response.data;
};

export const estimatePlaygroundTokens = async (messages, modelId) => {
  const response = await api.post('/playground/estimate', { messages, modelId });
  return response.data;
};

export const chatWithPlayground = async (messages, walletAddress, model) => {
  const response = await api.post('/playground/chat', { messages, walletAddress, model });
  return response.data;
};

export const chatWithDappier = async (modelId, query, walletAddress) => {
  const response = await api.post('/playground/dappier', { modelId, query, walletAddress });
  return response.data;
};

export const getGithubAuthUrl = async () => {
  const response = await api.get('/auth/github/url');
  return response.data;
};

export const exchangeGithubCode = async (code) => {
  const response = await api.post('/auth/github', { code });
  return response.data;
};

export const sendReportToGithub = async (githubUrl, reportMarkdown, githubUsername) => {
  const response = await api.post('/comment', { githubUrl, reportMarkdown, githubUsername });
  return response.data;
};

export const checkGithubAuthStatus = async (username) => {
  try {
    const response = await api.get(`/auth/github/status/${username}`);
    return response.data.authenticated;
  } catch (error) {
    return false;
  }
};

export default api;
