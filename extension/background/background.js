/**
 * Background service worker for ReadLater Pro extension
 * Handles article saving, authentication, and API communication
 */

// API endpoint
const API_BASE_URL = 'https://api.readlaterpro.com';

// Authentication state
let authToken = null;

/**
 * Initialize the extension
 */
async function initialize() {
  // Check if user is authenticated
  const { token } = await chrome.storage.local.get('token');
  if (token) {
    authToken = token;
    console.log('User is authenticated');
  } else {
    console.log('User is not authenticated');
  }
}

/**
 * Save the current page as an article
 * @param {number} tabId - The ID of the current tab
 */
async function saveArticle(tabId) {
  try {
    // Get the current tab information
    const tab = await chrome.tabs.get(tabId);
    
    // Extract basic information
    const article = {
      url: tab.url,
      title: tab.title,
      savedAt: new Date().toISOString()
    };
    
    // Execute content script to extract additional information
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractArticleInfo
    });
    
    // Merge the extracted information
    Object.assign(article, result.result);
    
    // Save to API if authenticated
    if (authToken) {
      const response = await fetch(`${API_BASE_URL}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(article)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save article to server');
      }
      
      const savedArticle = await response.json();
      
      // Update local storage with the saved article
      await updateLocalArticles(savedArticle);
      
      return { success: true, article: savedArticle };
    } else {
      // Save locally if not authenticated
      await updateLocalArticles(article);
      return { success: true, article, localOnly: true };
    }
  } catch (error) {
    console.error('Error saving article:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract article information from the current page
 * @returns {Object} Article information
 */
function extractArticleInfo() {
  // Get the domain
  const domain = window.location.hostname;
  
  // Estimate reading time
  const content = document.body.innerText;
  const wordCount = content.split(/\s+/).length;
  const wpm = 200; // Average reading speed
  const estimatedReadingTimeMinutes = Math.ceil(wordCount / wpm);
  
  // Get a content snippet
  const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.textContent);
  const contentSnippet = paragraphs.slice(0, 3).join(' ').substring(0, 300) + '...';
  
  return {
    domain,
    estimatedReadingTimeMinutes,
    contentSnippet,
    wordCount,
    progressPercent: 0
  };
}

/**
 * Update local storage with a new article
 * @param {Object} article - The article to save
 */
async function updateLocalArticles(article) {
  const { articles = [] } = await chrome.storage.local.get('articles');
  
  // Check if article already exists
  const existingIndex = articles.findIndex(a => a.url === article.url);
  
  if (existingIndex >= 0) {
    // Update existing article
    articles[existingIndex] = { ...articles[existingIndex], ...article };
  } else {
    // Add new article
    articles.push(article);
  }
  
  // Save to local storage
  await chrome.storage.local.set({ articles });
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveArticle') {
    saveArticle(sender.tab.id).then(sendResponse);
    return true; // Indicates async response
  }
  
  if (message.action === 'getArticles') {
    chrome.storage.local.get('articles').then(({ articles = [] }) => {
      sendResponse({ articles });
    });
    return true; // Indicates async response
  }
  
  if (message.action === 'setAuthToken') {
    authToken = message.token;
    chrome.storage.local.set({ token: authToken }).then(() => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
  
  if (message.action === 'clearAuthToken') {
    authToken = null;
    chrome.storage.local.remove('token').then(() => {
      sendResponse({ success: true });
    });
    return true; // Indicates async response
  }
});

// Initialize when the service worker starts
initialize();
