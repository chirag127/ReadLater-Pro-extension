/**
 * Highlighter content script for ReadLater Pro extension
 * Handles text highlighting and note-taking on saved articles
 */

// Configuration
const API_BASE_URL = 'https://api.readlaterpro.com';
const HIGHLIGHT_COLORS = {
  yellow: 'rgba(255, 235, 59, 0.5)',
  green: 'rgba(76, 175, 80, 0.5)',
  blue: 'rgba(33, 150, 243, 0.5)',
  pink: 'rgba(233, 30, 99, 0.5)'
};

// State
let isArticleSaved = false;
let articleId = null;
let authToken = null;
let highlights = [];
let isHighlightMode = false;
let currentHighlightColor = 'yellow';

/**
 * Initialize the highlighter
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
    
    // Load existing highlights
    if (articleId) {
      await loadHighlights();
    }
    
    // Create highlighter UI
    createHighlighterUI();
    
    // Add event listeners
    setupEventListeners();
  }
  
  // Listen for article save events
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'articleSaved' && message.article.url === currentUrl) {
      isArticleSaved = true;
      articleId = message.article._id;
      
      // Create highlighter UI if not already created
      if (!document.getElementById('readlater-pro-highlighter')) {
        createHighlighterUI();
        setupEventListeners();
      }
      
      sendResponse({ success: true });
    }
    return true;
  });
}

/**
 * Load existing highlights from the server
 */
async function loadHighlights() {
  if (!authToken || !articleId) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/highlights/article/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load highlights');
    }
    
    const { highlights: loadedHighlights } = await response.json();
    highlights = loadedHighlights;
    
    // Apply highlights to the page
    applyHighlights();
  } catch (error) {
    console.error('Error loading highlights:', error);
  }
}

/**
 * Apply highlights to the page
 */
function applyHighlights() {
  highlights.forEach(highlight => {
    try {
      const { selectorInfo, color } = highlight;
      
      // Apply highlight based on selector info
      if (selectorInfo.type === 'range') {
        applyRangeHighlight(highlight);
      }
    } catch (error) {
      console.error('Error applying highlight:', error);
    }
  });
}

/**
 * Apply a highlight using range selector info
 * @param {Object} highlight - The highlight to apply
 */
function applyRangeHighlight(highlight) {
  const { selectorInfo, color } = highlight;
  const { startPath, startOffset, endPath, endOffset } = selectorInfo;
  
  try {
    // Find start and end nodes
    const startNode = findNodeByPath(document.body, startPath);
    const endNode = findNodeByPath(document.body, endPath);
    
    if (!startNode || !endNode) {
      console.error('Could not find nodes for highlight');
      return;
    }
    
    // Create range
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    
    // Apply highlight
    highlightRange(range, color, highlight._id);
  } catch (error) {
    console.error('Error applying range highlight:', error);
  }
}

/**
 * Find a node by its path
 * @param {Node} rootNode - The root node to start from
 * @param {Array} path - The path to the node
 * @returns {Node} The found node
 */
function findNodeByPath(rootNode, path) {
  let currentNode = rootNode;
  
  for (const index of path) {
    if (!currentNode.childNodes || !currentNode.childNodes[index]) {
      return null;
    }
    currentNode = currentNode.childNodes[index];
  }
  
  return currentNode;
}

/**
 * Create the highlighter UI
 */
function createHighlighterUI() {
  // Create container
  const container = document.createElement('div');
  container.id = 'readlater-pro-highlighter';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  `;
  
  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'readlater-pro-toggle';
  toggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;
  toggleButton.style.cssText = `
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: #4a6ee0;
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: background-color 0.2s;
  `;
  
  // Create toolbar
  const toolbar = document.createElement('div');
  toolbar.id = 'readlater-pro-toolbar';
  toolbar.style.cssText = `
    display: none;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    padding: 8px;
    margin-bottom: 8px;
  `;
  
  // Create color buttons
  const colorButtons = document.createElement('div');
  colorButtons.style.cssText = `
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  `;
  
  Object.entries(HIGHLIGHT_COLORS).forEach(([colorName, colorValue]) => {
    const colorButton = document.createElement('button');
    colorButton.dataset.color = colorName;
    colorButton.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${colorValue};
      border: 2px solid ${colorName === currentHighlightColor ? '#333' : 'transparent'};
      cursor: pointer;
    `;
    colorButton.addEventListener('click', () => {
      // Update selected color
      currentHighlightColor = colorName;
      
      // Update button styles
      colorButtons.querySelectorAll('button').forEach(btn => {
        btn.style.border = btn.dataset.color === currentHighlightColor
          ? '2px solid #333'
          : 'transparent';
      });
    });
    
    colorButtons.appendChild(colorButton);
  });
  
  // Create action buttons
  const actionButtons = document.createElement('div');
  actionButtons.style.cssText = `
    display: flex;
    gap: 8px;
  `;
  
  const highlightButton = document.createElement('button');
  highlightButton.textContent = 'Highlight';
  highlightButton.style.cssText = `
    background-color: #4a6ee0;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  highlightButton.addEventListener('click', toggleHighlightMode);
  
  const noteButton = document.createElement('button');
  noteButton.textContent = 'Add Note';
  noteButton.style.cssText = `
    background-color: #f5f7ff;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  noteButton.addEventListener('click', addNote);
  
  actionButtons.appendChild(highlightButton);
  actionButtons.appendChild(noteButton);
  
  // Assemble toolbar
  toolbar.appendChild(colorButtons);
  toolbar.appendChild(actionButtons);
  
  // Assemble container
  container.appendChild(toolbar);
  container.appendChild(toggleButton);
  
  // Add to page
  document.body.appendChild(container);
  
  // Add event listener to toggle button
  toggleButton.addEventListener('click', () => {
    const isVisible = toolbar.style.display === 'block';
    toolbar.style.display = isVisible ? 'none' : 'block';
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Listen for selection changes
  document.addEventListener('mouseup', handleSelection);
  
  // Listen for clicks to clear selection
  document.addEventListener('click', (e) => {
    // Ignore clicks on the highlighter UI
    if (e.target.closest('#readlater-pro-highlighter')) {
      return;
    }
    
    // Clear selection if not in highlight mode
    if (!isHighlightMode) {
      window.getSelection().removeAllRanges();
    }
  });
}

/**
 * Handle text selection
 */
function handleSelection() {
  // Ignore if not in highlight mode
  if (!isHighlightMode) return;
  
  const selection = window.getSelection();
  
  if (selection.rangeCount === 0 || selection.toString().trim() === '') {
    return;
  }
  
  const range = selection.getRangeAt(0);
  
  // Create highlight
  createHighlight(range);
  
  // Clear selection
  selection.removeAllRanges();
}

/**
 * Toggle highlight mode
 */
function toggleHighlightMode() {
  isHighlightMode = !isHighlightMode;
  
  // Update button text
  const highlightButton = document.querySelector('#readlater-pro-toolbar button:first-child');
  highlightButton.textContent = isHighlightMode ? 'Cancel' : 'Highlight';
  highlightButton.style.backgroundColor = isHighlightMode ? '#f44336' : '#4a6ee0';
  
  // Update cursor
  document.body.style.cursor = isHighlightMode ? 'text' : '';
  
  // Clear selection
  window.getSelection().removeAllRanges();
}

/**
 * Create a highlight from a range
 * @param {Range} range - The range to highlight
 */
async function createHighlight(range) {
  try {
    // Get selector info
    const selectorInfo = {
      type: 'range',
      startPath: getNodePath(range.startContainer),
      startOffset: range.startOffset,
      endPath: getNodePath(range.endContainer),
      endOffset: range.endOffset
    };
    
    // Create highlight object
    const highlight = {
      articleId,
      selectedText: range.toString(),
      selectorInfo,
      color: currentHighlightColor
    };
    
    // Save to server if authenticated
    if (authToken) {
      const response = await fetch(`${API_BASE_URL}/highlights/article/${articleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(highlight)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save highlight to server');
      }
      
      const { highlight: savedHighlight } = await response.json();
      
      // Add to highlights array
      highlights.push(savedHighlight);
      
      // Apply highlight to the page
      highlightRange(range, HIGHLIGHT_COLORS[currentHighlightColor], savedHighlight._id);
    } else {
      // Apply highlight locally
      const localHighlightId = `local-${Date.now()}`;
      highlight._id = localHighlightId;
      
      // Add to highlights array
      highlights.push(highlight);
      
      // Apply highlight to the page
      highlightRange(range, HIGHLIGHT_COLORS[currentHighlightColor], localHighlightId);
    }
  } catch (error) {
    console.error('Error creating highlight:', error);
  }
}

/**
 * Get the path to a node from the body
 * @param {Node} node - The node to get the path for
 * @returns {Array} The path to the node
 */
function getNodePath(node) {
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
}

/**
 * Highlight a range
 * @param {Range} range - The range to highlight
 * @param {string} color - The highlight color
 * @param {string} highlightId - The ID of the highlight
 */
function highlightRange(range, color, highlightId) {
  // Create highlight element
  const highlightElement = document.createElement('span');
  highlightElement.className = 'readlater-pro-highlight';
  highlightElement.dataset.highlightId = highlightId;
  highlightElement.style.backgroundColor = color;
  highlightElement.style.borderRadius = '2px';
  
  // Add context menu event
  highlightElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showHighlightContextMenu(e, highlightId);
  });
  
  // Apply highlight
  range.surroundContents(highlightElement);
}

/**
 * Show context menu for a highlight
 * @param {Event} event - The context menu event
 * @param {string} highlightId - The ID of the highlight
 */
function showHighlightContextMenu(event, highlightId) {
  // Remove any existing context menu
  const existingMenu = document.getElementById('readlater-pro-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Create context menu
  const contextMenu = document.createElement('div');
  contextMenu.id = 'readlater-pro-context-menu';
  contextMenu.style.cssText = `
    position: absolute;
    top: ${event.pageY}px;
    left: ${event.pageX}px;
    background-color: white;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    padding: 8px;
    z-index: 10000;
  `;
  
  // Add menu items
  const addNoteItem = document.createElement('div');
  addNoteItem.textContent = 'Add Note';
  addNoteItem.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  addNoteItem.addEventListener('click', () => {
    addNoteToHighlight(highlightId);
    contextMenu.remove();
  });
  
  const removeItem = document.createElement('div');
  removeItem.textContent = 'Remove Highlight';
  removeItem.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
    color: #f44336;
  `;
  removeItem.addEventListener('click', () => {
    removeHighlight(highlightId);
    contextMenu.remove();
  });
  
  contextMenu.appendChild(addNoteItem);
  contextMenu.appendChild(removeItem);
  
  // Add to page
  document.body.appendChild(contextMenu);
  
  // Close menu when clicking outside
  document.addEventListener('click', () => {
    contextMenu.remove();
  }, { once: true });
}

/**
 * Add a note to a highlight
 * @param {string} highlightId - The ID of the highlight
 */
function addNoteToHighlight(highlightId) {
  // Find the highlight
  const highlight = highlights.find(h => h._id === highlightId);
  
  if (!highlight) {
    console.error('Highlight not found');
    return;
  }
  
  // Create note dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = `
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    padding: 16px;
    width: 400px;
    max-width: 90%;
  `;
  
  const dialogTitle = document.createElement('h3');
  dialogTitle.textContent = 'Add Note';
  dialogTitle.style.cssText = `
    margin: 0 0 16px 0;
    font-family: sans-serif;
    font-size: 18px;
  `;
  
  const highlightText = document.createElement('div');
  highlightText.textContent = highlight.selectedText;
  highlightText.style.cssText = `
    background-color: ${HIGHLIGHT_COLORS[highlight.color]};
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 16px;
    font-family: sans-serif;
    font-size: 14px;
  `;
  
  const noteInput = document.createElement('textarea');
  noteInput.placeholder = 'Enter your note...';
  noteInput.style.cssText = `
    width: 100%;
    height: 100px;
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 14px;
    resize: vertical;
    margin-bottom: 16px;
  `;
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `;
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    background-color: #f5f7ff;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  cancelButton.addEventListener('click', () => {
    dialog.remove();
  });
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Note';
  saveButton.style.cssText = `
    background-color: #4a6ee0;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  saveButton.addEventListener('click', async () => {
    const noteText = noteInput.value.trim();
    
    if (!noteText) {
      return;
    }
    
    try {
      // Save note to server if authenticated
      if (authToken) {
        const response = await fetch(`${API_BASE_URL}/notes/article/${articleId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            highlightId,
            noteText
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save note to server');
        }
      }
      
      // Show success message
      alert('Note saved successfully');
      
      // Close dialog
      dialog.remove();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note. Please try again.');
    }
  });
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(saveButton);
  
  dialogContent.appendChild(dialogTitle);
  dialogContent.appendChild(highlightText);
  dialogContent.appendChild(noteInput);
  dialogContent.appendChild(buttonContainer);
  
  dialog.appendChild(dialogContent);
  
  // Add to page
  document.body.appendChild(dialog);
  
  // Focus input
  noteInput.focus();
}

/**
 * Remove a highlight
 * @param {string} highlightId - The ID of the highlight
 */
async function removeHighlight(highlightId) {
  try {
    // Remove from DOM
    const highlightElement = document.querySelector(`.readlater-pro-highlight[data-highlight-id="${highlightId}"]`);
    
    if (highlightElement) {
      // Replace with text content
      const textNode = document.createTextNode(highlightElement.textContent);
      highlightElement.parentNode.replaceChild(textNode, highlightElement);
    }
    
    // Remove from server if authenticated
    if (authToken && !highlightId.startsWith('local-')) {
      const response = await fetch(`${API_BASE_URL}/highlights/${highlightId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete highlight from server');
      }
    }
    
    // Remove from highlights array
    highlights = highlights.filter(h => h._id !== highlightId);
  } catch (error) {
    console.error('Error removing highlight:', error);
  }
}

/**
 * Add a note to the article
 */
function addNote() {
  // Create note dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = `
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    padding: 16px;
    width: 400px;
    max-width: 90%;
  `;
  
  const dialogTitle = document.createElement('h3');
  dialogTitle.textContent = 'Add Note to Article';
  dialogTitle.style.cssText = `
    margin: 0 0 16px 0;
    font-family: sans-serif;
    font-size: 18px;
  `;
  
  const noteInput = document.createElement('textarea');
  noteInput.placeholder = 'Enter your note...';
  noteInput.style.cssText = `
    width: 100%;
    height: 100px;
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 14px;
    resize: vertical;
    margin-bottom: 16px;
  `;
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `;
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    background-color: #f5f7ff;
    color: #333;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  cancelButton.addEventListener('click', () => {
    dialog.remove();
  });
  
  const saveButton = document.createElement('button');
  saveButton.textContent = 'Save Note';
  saveButton.style.cssText = `
    background-color: #4a6ee0;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    cursor: pointer;
    font-family: sans-serif;
    font-size: 14px;
  `;
  saveButton.addEventListener('click', async () => {
    const noteText = noteInput.value.trim();
    
    if (!noteText) {
      return;
    }
    
    try {
      // Save note to server if authenticated
      if (authToken) {
        const response = await fetch(`${API_BASE_URL}/notes/article/${articleId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            noteText
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to save note to server');
        }
      }
      
      // Show success message
      alert('Note saved successfully');
      
      // Close dialog
      dialog.remove();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note. Please try again.');
    }
  });
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(saveButton);
  
  dialogContent.appendChild(dialogTitle);
  dialogContent.appendChild(noteInput);
  dialogContent.appendChild(buttonContainer);
  
  dialog.appendChild(dialogContent);
  
  // Add to page
  document.body.appendChild(dialog);
  
  // Focus input
  noteInput.focus();
}

// Initialize when the content script loads
initialize();
