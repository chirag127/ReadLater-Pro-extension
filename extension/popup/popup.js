/**
 * Popup script for ReadLater Pro extension
 * Handles UI interactions and communicates with the background service worker
 */

// DOM Elements
const authSection = document.getElementById('auth-section');
const loggedOutSection = document.getElementById('logged-out');
const loggedInSection = document.getElementById('logged-in');
const userEmailElement = document.getElementById('user-email');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

const saveSection = document.getElementById('save-section');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');
const saveMessage = document.getElementById('save-message');
const articleInfo = document.getElementById('article-info');
const articleTitle = document.getElementById('article-title');
const articleDomain = document.getElementById('article-domain');
const readingTime = document.getElementById('reading-time');
const tagInput = document.getElementById('tag-input');
const tagsList = document.getElementById('tags-list');

const listSection = document.getElementById('list-section');
const recentArticles = document.getElementById('recent-articles');
const viewAllBtn = document.getElementById('view-all-btn');

// State
let currentArticle = null;
let currentTags = [];
let isAuthenticated = false;
let userEmail = '';

/**
 * Initialize the popup
 */
async function initialize() {
  // Check authentication status
  const { token, userInfo } = await chrome.storage.local.get(['token', 'userInfo']);
  
  if (token && userInfo) {
    isAuthenticated = true;
    userEmail = userInfo.email;
    updateAuthUI();
  }
  
  // Get current tab information
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if the current URL is already saved
  const { articles = [] } = await chrome.storage.local.get('articles');
  const savedArticle = articles.find(article => article.url === tab.url);
  
  if (savedArticle) {
    currentArticle = savedArticle;
    updateSaveUI(true);
    
    // Load tags if available
    if (savedArticle.tags) {
      currentTags = savedArticle.tags;
      renderTags();
    }
  } else {
    // Pre-populate with tab information
    articleTitle.textContent = tab.title;
    articleDomain.textContent = new URL(tab.url).hostname;
  }
  
  // Load recent articles
  loadRecentArticles(articles);
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Update the authentication UI based on login state
 */
function updateAuthUI() {
  if (isAuthenticated) {
    loggedOutSection.classList.add('hidden');
    loggedInSection.classList.remove('hidden');
    userEmailElement.textContent = userEmail;
  } else {
    loggedOutSection.classList.remove('hidden');
    loggedInSection.classList.add('hidden');
  }
}

/**
 * Update the save UI based on whether the article is saved
 * @param {boolean} isSaved - Whether the article is saved
 */
function updateSaveUI(isSaved) {
  if (isSaved) {
    saveBtn.textContent = 'Update Article';
    saveStatus.classList.remove('hidden');
    articleInfo.classList.remove('hidden');
    
    // Update article info
    articleTitle.textContent = currentArticle.title;
    articleDomain.textContent = currentArticle.domain;
    
    if (currentArticle.estimatedReadingTimeMinutes) {
      readingTime.textContent = `${currentArticle.estimatedReadingTimeMinutes} min read`;
    }
  } else {
    saveBtn.textContent = 'Save This Article';
    saveStatus.classList.add('hidden');
  }
}

/**
 * Load recent articles into the UI
 * @param {Array} articles - List of saved articles
 */
function loadRecentArticles(articles) {
  recentArticles.innerHTML = '';
  
  if (!articles || articles.length === 0) {
    recentArticles.innerHTML = '<div class="empty-state">No saved articles yet</div>';
    return;
  }
  
  // Show only the 3 most recent articles
  const recentItems = articles.sort((a, b) => {
    return new Date(b.savedAt) - new Date(a.savedAt);
  }).slice(0, 3);
  
  recentItems.forEach(article => {
    const articleElement = document.createElement('div');
    articleElement.className = 'article-item';
    
    const title = document.createElement('h4');
    title.textContent = article.title;
    
    const meta = document.createElement('div');
    meta.className = 'article-item-meta';
    
    const domain = document.createElement('span');
    domain.textContent = article.domain;
    
    const time = document.createElement('span');
    time.textContent = article.estimatedReadingTimeMinutes 
      ? `${article.estimatedReadingTimeMinutes} min read` 
      : '';
    
    meta.appendChild(domain);
    meta.appendChild(time);
    
    const progress = document.createElement('div');
    progress.className = 'progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${article.progressPercent || 0}%`;
    
    progress.appendChild(progressFill);
    
    articleElement.appendChild(title);
    articleElement.appendChild(meta);
    articleElement.appendChild(progress);
    
    // Add click event to open the article
    articleElement.addEventListener('click', () => {
      chrome.tabs.create({ url: article.url });
    });
    
    recentArticles.appendChild(articleElement);
  });
}

/**
 * Render tags in the UI
 */
function renderTags() {
  tagsList.innerHTML = '';
  
  currentTags.forEach(tag => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    
    const tagText = document.createElement('span');
    tagText.textContent = tag;
    
    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTag(tag);
    });
    
    tagElement.appendChild(tagText);
    tagElement.appendChild(removeBtn);
    tagsList.appendChild(tagElement);
  });
}

/**
 * Remove a tag from the current article
 * @param {string} tagToRemove - The tag to remove
 */
async function removeTag(tagToRemove) {
  currentTags = currentTags.filter(tag => tag !== tagToRemove);
  renderTags();
  
  if (currentArticle && currentArticle._id) {
    // Update tags on the server
    await updateArticleTags();
  }
}

/**
 * Add a new tag to the current article
 * @param {string} tag - The tag to add
 */
async function addTag(tag) {
  if (!tag || currentTags.includes(tag)) return;
  
  currentTags.push(tag);
  renderTags();
  
  if (currentArticle && currentArticle._id) {
    // Update tags on the server
    await updateArticleTags();
  }
}

/**
 * Update article tags on the server
 */
async function updateArticleTags() {
  if (!isAuthenticated || !currentArticle || !currentArticle._id) return;
  
  try {
    const { token } = await chrome.storage.local.get('token');
    
    const response = await fetch(`https://api.readlaterpro.com/articles/${currentArticle._id}/tags`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ tags: currentTags })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update tags');
    }
    
    // Update local storage
    const { articles = [] } = await chrome.storage.local.get('articles');
    const articleIndex = articles.findIndex(a => a._id === currentArticle._id);
    
    if (articleIndex >= 0) {
      articles[articleIndex].tags = currentTags;
      await chrome.storage.local.set({ articles });
    }
  } catch (error) {
    console.error('Error updating tags:', error);
  }
}

/**
 * Save the current article
 */
async function saveCurrentArticle() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Show saving state
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    // Send message to background script
    const result = await chrome.runtime.sendMessage({
      action: 'saveArticle',
      tabId: tab.id
    });
    
    if (result.success) {
      currentArticle = result.article;
      
      // Add tags if any
      if (currentTags.length > 0 && currentArticle._id) {
        await updateArticleTags();
      }
      
      // Update UI
      updateSaveUI(true);
      saveMessage.textContent = 'Saved!';
      
      // Refresh recent articles
      const { articles = [] } = await chrome.storage.local.get('articles');
      loadRecentArticles(articles);
    } else {
      saveMessage.textContent = 'Error saving';
      saveStatus.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error saving article:', error);
    saveMessage.textContent = 'Error saving';
    saveStatus.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
  }
}

/**
 * Open the login page
 */
function openLoginPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/auth.html') });
}

/**
 * Log out the current user
 */
async function logout() {
  try {
    await chrome.runtime.sendMessage({ action: 'clearAuthToken' });
    isAuthenticated = false;
    userEmail = '';
    updateAuthUI();
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

/**
 * Open the full reading list page
 */
function openReadingList() {
  chrome.tabs.create({ url: chrome.runtime.getURL('pages/reading-list.html') });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Save button
  saveBtn.addEventListener('click', saveCurrentArticle);
  
  // Login button
  loginBtn.addEventListener('click', openLoginPage);
  
  // Logout button
  logoutBtn.addEventListener('click', logout);
  
  // View all button
  viewAllBtn.addEventListener('click', openReadingList);
  
  // Tag input
  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && tagInput.value.trim()) {
      addTag(tagInput.value.trim());
      tagInput.value = '';
    }
  });
}

// Initialize the popup when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);
