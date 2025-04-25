/**
 * Content script for tracking reading progress
 * Monitors scroll position and sends updates to the background script
 */

// Configuration
const SCROLL_DEBOUNCE_MS = 500; // Debounce time for scroll events
const PROGRESS_UPDATE_INTERVAL_MS = 5000; // Interval for sending progress updates
const API_BASE_URL = 'https://api.readlaterpro.com';

// State
let isArticleSaved = false;
let articleId = null;
let lastScrollPosition = 0;
let lastScrollPercentage = 0;
let scrollDebounceTimer = null;
let progressUpdateTimer = null;
let authToken = null;

/**
 * Initialize the progress tracker
 */
async function initialize() {
  // Check if the current page is saved
  const currentUrl = window.location.href;
  const { articles = [], token } = await chrome.storage.local.get(['articles', 'token']);
  
  const savedArticle = articles.find(article => article.url === currentUrl);
  
  if (savedArticle) {
    isArticleSaved = true;
    articleId = savedArticle._id;
    authToken = token;
    
    // Restore scroll position if available
    if (savedArticle.scrollPosition) {
      restoreScrollPosition(savedArticle.scrollPosition);
    }
    
    // Start tracking progress
    startProgressTracking();
  }
  
  // Listen for article save events
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'articleSaved' && message.article.url === currentUrl) {
      isArticleSaved = true;
      articleId = message.article._id;
      startProgressTracking();
      sendResponse({ success: true });
    }
    return true;
  });
}

/**
 * Start tracking reading progress
 */
function startProgressTracking() {
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll);
  
  // Set up periodic progress updates
  progressUpdateTimer = setInterval(sendProgressUpdate, PROGRESS_UPDATE_INTERVAL_MS);
  
  // Initial progress calculation
  calculateProgress();
}

/**
 * Handle scroll events
 */
function handleScroll() {
  // Debounce scroll events
  clearTimeout(scrollDebounceTimer);
  scrollDebounceTimer = setTimeout(() => {
    calculateProgress();
  }, SCROLL_DEBOUNCE_MS);
}

/**
 * Calculate reading progress based on scroll position
 */
function calculateProgress() {
  if (!isArticleSaved) return;
  
  // Calculate scroll position
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight
  );
  const clientHeight = document.documentElement.clientHeight;
  
  // Calculate scroll percentage (0-100)
  const scrollPercentage = Math.min(
    Math.round((scrollTop / (scrollHeight - clientHeight)) * 100),
    100
  );
  
  // Update state
  lastScrollPosition = scrollTop;
  lastScrollPercentage = scrollPercentage;
  
  // Save scroll position locally
  saveScrollPositionLocally();
}

/**
 * Save scroll position to local storage
 */
async function saveScrollPositionLocally() {
  try {
    const { articles = [] } = await chrome.storage.local.get('articles');
    const currentUrl = window.location.href;
    
    // Find the article in local storage
    const articleIndex = articles.findIndex(article => article.url === currentUrl);
    
    if (articleIndex >= 0) {
      // Update scroll position and progress
      articles[articleIndex].scrollPosition = {
        type: 'pixel',
        value: lastScrollPosition
      };
      articles[articleIndex].progressPercent = lastScrollPercentage;
      
      // Save to local storage
      await chrome.storage.local.set({ articles });
    }
  } catch (error) {
    console.error('Error saving scroll position locally:', error);
  }
}

/**
 * Send progress update to the server
 */
async function sendProgressUpdate() {
  if (!isArticleSaved || !articleId || !authToken) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/articles/${articleId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        scrollPosition: {
          type: 'pixel',
          value: lastScrollPosition
        },
        progressPercent: lastScrollPercentage
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update progress on server');
    }
  } catch (error) {
    console.error('Error sending progress update:', error);
  }
}

/**
 * Restore scroll position when opening a saved article
 * @param {Object} scrollPosition - The saved scroll position
 */
function restoreScrollPosition(scrollPosition) {
  if (!scrollPosition) return;
  
  // Wait for page to be fully loaded
  setTimeout(() => {
    if (scrollPosition.type === 'pixel') {
      window.scrollTo({
        top: scrollPosition.value,
        behavior: 'smooth'
      });
    } else if (scrollPosition.type === 'percent') {
      const scrollHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight
      );
      const clientHeight = document.documentElement.clientHeight;
      const scrollTop = (scrollPosition.value / 100) * (scrollHeight - clientHeight);
      
      window.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, 500);
}

/**
 * Clean up when the page is unloaded
 */
function cleanup() {
  // Remove event listeners
  window.removeEventListener('scroll', handleScroll);
  
  // Clear timers
  clearTimeout(scrollDebounceTimer);
  clearInterval(progressUpdateTimer);
  
  // Send final progress update
  calculateProgress();
  sendProgressUpdate();
}

// Initialize when the content script loads
initialize();

// Clean up when the page is unloaded
window.addEventListener('beforeunload', cleanup);
