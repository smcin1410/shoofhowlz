// Time utility functions for formatting and converting time values

/**
 * Format seconds into MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "1:30")
 */
export const formatTimeDisplay = (seconds) => {
  if (!seconds || seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Convert minutes to seconds
 * @param {number} minutes - Time in minutes
 * @returns {number} Time in seconds
 */
export const minutesToSeconds = (minutes) => {
  return minutes * 60;
};

/**
 * Convert seconds to minutes
 * @param {number} seconds - Time in seconds
 * @returns {number} Time in minutes
 */
export const secondsToMinutes = (seconds) => {
  return Math.floor(seconds / 60);
};
