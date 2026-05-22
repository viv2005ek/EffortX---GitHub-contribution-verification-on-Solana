import axios from 'axios';

const api = axios.create({
  baseURL: 'https://effortx-commit-analyzer.vercel.app/api',
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

export default api;
