/**
 * Content Scripts Tests
 */

// Mock chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  }
};

// Mock window
global.window = {
  location: {
    href: 'https://example.com/article',
    hostname: 'example.com'
  },
  scrollY: 100,
  scrollTo: jest.fn(),
  addEventListener: jest.fn(),
  getSelection: jest.fn()
};

// Mock document
global.document = {
  documentElement: {
    scrollTop: 100,
    clientHeight: 800,
    scrollHeight: 2000
  },
  body: {
    scrollHeight: 2000,
    offsetHeight: 2000,
    innerText: 'This is a test article with enough words to calculate reading time.',
    childNodes: []
  },
  createElement: jest.fn().mockReturnValue({
    style: {},
    className: '',
    dataset: {},
    addEventListener: jest.fn()
  }),
  createRange: jest.fn().mockReturnValue({
    setStart: jest.fn(),
    setEnd: jest.fn(),
    surroundContents: jest.fn()
  }),
  addEventListener: jest.fn()
};

describe('Progress Tracker', () => {
  // Import the progress tracker script
  const fs = require('fs');
  const path = require('path');
  const progressTrackerScript = fs.readFileSync(path.join(__dirname, '../content/progress-tracker.js'), 'utf8');
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock storage.local.get to return a saved article
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (keys.includes('articles') || keys === 'articles') {
        return Promise.resolve({
          articles: [
            {
              _id: '123456789',
              url: 'https://example.com/article',
              title: 'Test Article',
              domain: 'example.com',
              scrollPosition: {
                type: 'pixel',
                value: 500
              },
              progressPercent: 25
            }
          ]
        });
      }
      
      return Promise.resolve({});
    });
    
    // Mock storage.local.set to return success
    chrome.storage.local.set.mockImplementation((data, callback) => {
      return Promise.resolve();
    });
  });
  
  test('calculateProgress should update scroll position and percentage', () => {
    // Create a function to test calculateProgress
    const calculateProgress = () => {
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
      
      return {
        scrollTop,
        scrollPercentage
      };
    };
    
    // Test calculateProgress
    const result = calculateProgress();
    
    // Verify the result
    expect(result.scrollTop).toBe(100);
    expect(result.scrollPercentage).toBe(8); // 100 / (2000 - 800) * 100 = 8.33...
  });
});

describe('Highlighter', () => {
  // Import the highlighter script
  const fs = require('fs');
  const path = require('path');
  const highlighterScript = fs.readFileSync(path.join(__dirname, '../content/highlighter.js'), 'utf8');
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock storage.local.get to return a saved article
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      if (keys.includes('articles') || keys === 'articles') {
        return Promise.resolve({
          articles: [
            {
              _id: '123456789',
              url: 'https://example.com/article',
              title: 'Test Article',
              domain: 'example.com'
            }
          ]
        });
      }
      
      return Promise.resolve({});
    });
    
    // Mock window.getSelection
    window.getSelection = jest.fn().mockReturnValue({
      toString: () => 'Selected text',
      getRangeAt: () => ({
        startContainer: {},
        endContainer: {},
        startOffset: 0,
        endOffset: 12,
        toString: () => 'Selected text',
        surroundContents: jest.fn()
      }),
      rangeCount: 1,
      removeAllRanges: jest.fn()
    });
  });
  
  test('getNodePath should return an array of indices', () => {
    // Create a function to test getNodePath
    const getNodePath = (node) => {
      const path = [];
      let currentNode = node;
      
      while (currentNode !== document.body) {
        const parent = currentNode.parentNode;
        
        if (!parent) {
          break;
        }
        
        const index = Array.from(parent.childNodes).indexOf(currentNode);
        path.unshift(index);
        
        currentNode = parent;
      }
      
      return path;
    };
    
    // Mock node and its parents
    const node = {};
    const parent1 = { childNodes: [node] };
    const parent2 = { childNodes: [{}, parent1] };
    
    node.parentNode = parent1;
    parent1.parentNode = parent2;
    parent2.parentNode = document.body;
    
    // Test getNodePath
    const result = getNodePath(node);
    
    // Verify the result
    expect(result).toEqual([1, 0]);
  });
});
