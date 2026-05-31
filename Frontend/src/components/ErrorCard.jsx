/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

const ErrorCard = ({ message, onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto px-4 py-10"
    >
      <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl flex flex-col items-center text-center">
        <div className="p-4 rounded-full bg-red-500/20 mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Analysis Failed</h3>
        <p className="text-text-main/70 mb-8 max-w-md">
          {message || "We encountered an error while analyzing the contribution. Please check the URL and try again."}
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </motion.div>
  );
};

export default ErrorCard;
