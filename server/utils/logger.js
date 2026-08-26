const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log('[DEBUG]', ...args);
  },
};

// Never log secrets/tokens with this helper
logger.safe = (obj) => {
  const clone = { ...obj };
  delete clone.password;
  delete clone.token;
  delete clone.resetToken;
  return clone;
};

module.exports = logger;
