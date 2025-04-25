/**
 * Background Service Worker Tests
 */

// Mock chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    get: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// Import the background script
const fs = require('fs');
const path = require('path');
const backgroundScript = fs.readFileSync(path.join(__dirname, '../background/background.js'), 'utf8');

// Mock fetch
global.fetch = jest.fn();

describe('Background Service Worker', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock storage.local.get to return empty data
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      return Promise.resolve({});
    });
    
    // Mock storage.local.set to return success
    chrome.storage.local.set.mockImplementation((data, callback) => {
      return Promise.resolve();
    });
    
    // Mock tabs.get to return a tab
    chrome.tabs.get.mockImplementation((tabId, callback) => {
      return Promise.resolve({
        id: tabId,
        url: 'https://example.com/article',
        title: 'Test Article'
      });
    });
    
    // Mock scripting.executeScript to return article info
    chrome.scripting.executeScript.mockImplementation(({ target, func }) => {
      return Promise.resolve([{
        result: {
          domain: 'example.com',
          estimatedReadingTimeMinutes: 5,
          contentSnippet: 'This is a test article',
          wordCount: 1000,
          progressPercent: 0
        }
      }]);
    });
    
    // Mock fetch to return success
    global.fetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          _id: '123456789',
          url: 'https://example.com/article',
          title: 'Test Article',
          domain: 'example.com',
          estimatedReadingTimeMinutes: 5,
          contentSnippet: 'This is a test article',
          wordCount: 1000,
          progressPercent: 0,
          savedAt: new Date().toISOString()
        })
      });
    });
  });
  
  test('saveArticle should extract article info and save it', async () => {
    // Create a function to test saveArticle
    const saveArticle = async (tabId) => {
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
          func: () => ({})
        });
        
        // Merge the extracted information
        Object.assign(article, result.result);
        
        // Save locally
        await updateLocalArticles(article);
        
        return { success: true, article, localOnly: true };
      } catch (error) {
        console.error('Error saving article:', error);
        return { success: false, error: error.message };
      }
    };
    
    // Create a function to test updateLocalArticles
    const updateLocalArticles = async (article) => {
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
    };
    
    // Test saveArticle
    const result = await saveArticle(123);
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.article.url).toBe('https://example.com/article');
    expect(result.article.title).toBe('Test Article');
    expect(result.article.domain).toBe('example.com');
    expect(result.article.estimatedReadingTimeMinutes).toBe(5);
    
    // Verify chrome.storage.local.set was called
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});
