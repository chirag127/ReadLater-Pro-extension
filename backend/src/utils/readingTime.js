/**
 * Reading time utility
 * Calculates estimated reading time for articles
 */

/**
 * Calculate estimated reading time in minutes
 * @param {string} text - The text to calculate reading time for
 * @param {number} wpm - Words per minute reading speed (default: 200)
 * @returns {number} Estimated reading time in minutes
 */
const calculateReadingTime = (text, wpm = 200) => {
  if (!text) return 0;
  
  // Count words
  const words = text.trim().split(/\s+/).length;
  
  // Calculate reading time
  const minutes = Math.ceil(words / wpm);
  
  return minutes;
};

module.exports = {
  calculateReadingTime
};
