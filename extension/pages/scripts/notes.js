/**
 * Notes page script for ReadLater Pro extension
 * Handles displaying and managing notes and highlights for an article
 */

// API endpoint
const API_BASE_URL = 'https://api.readlaterpro.com';

// DOM Elements
const articleTitleElement = document.getElementById('article-title');
const articleDomainElement = document.getElementById('article-domain');
const articleDateElement = document.getElementById('article-date');
const openArticleBtn = document.getElementById('open-article-btn');
const backToListBtn = document.getElementById('back-to-list-btn');

const addNoteBtn = document.getElementById('add-note-btn');
const notesLoadingElement = document.getElementById('loading');
const notesEmptyElement = document.getElementById('empty-state');
const notesListElement = document.getElementById('notes-list');

const highlightsLoadingElement = document.getElementById('highlights-loading');
const highlightsEmptyElement = document.getElementById('highlights-empty');
const highlightsListElement = document.getElementById('highlights-list');

const noteModal = document.getElementById('note-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const noteTextElement = document.getElementById('note-text');
const cancelNoteBtn = document.getElementById('cancel-note-btn');
const saveNoteBtn = document.getElementById('save-note-btn');

// State
let article = null;
let notes = [];
let highlights = [];
let isAuthenticated = false;
let authToken = null;
let editingNoteId = null;

/**
 * Initialize the notes page
 */
async function initialize() {
  // Get article ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  
  if (!articleId) {
    showError('Article ID is missing');
    return;
  }
  
  // Check authentication status
  const { token } = await chrome.storage.local.get('token');
  
  if (token) {
    isAuthenticated = true;
    authToken = token;
  }
  
  // Load article
  await loadArticle(articleId);
  
  // Load notes and highlights
  await Promise.all([
    loadNotes(articleId),
    loadHighlights(articleId)
  ]);
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Load article data
 * @param {string} articleId - The ID of the article
 */
async function loadArticle(articleId) {
  try {
    // Try to get from API if authenticated
    if (isAuthenticated) {
      try {
        const response = await fetch(`${API_BASE_URL}/articles/${articleId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          const { article: apiArticle } = await response.json();
          article = apiArticle;
          updateArticleUI();
          return;
        }
      } catch (error) {
        console.error('Error fetching article from API:', error);
        // Fall back to local storage
      }
    }
    
    // Get from local storage
    const { articles = [] } = await chrome.storage.local.get('articles');
    article = articles.find(a => a._id === articleId);
    
    if (!article) {
      showError('Article not found');
      return;
    }
    
    updateArticleUI();
  } catch (error) {
    console.error('Error loading article:', error);
    showError('Error loading article');
  }
}

/**
 * Update the article UI
 */
function updateArticleUI() {
  articleTitleElement.textContent = article.title;
  articleDomainElement.textContent = article.domain;
  
  // Format date
  const savedDate = new Date(article.savedAt);
  articleDateElement.textContent = savedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Set up open article button
  openArticleBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: article.url });
  });
}

/**
 * Load notes for the article
 * @param {string} articleId - The ID of the article
 */
async function loadNotes(articleId) {
  try {
    notesLoadingElement.classList.remove('hidden');
    notesEmptyElement.classList.add('hidden');
    notesListElement.classList.add('hidden');
    
    // Try to get from API if authenticated
    if (isAuthenticated) {
      try {
        const response = await fetch(`${API_BASE_URL}/notes/article/${articleId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          const { notes: apiNotes } = await response.json();
          notes = apiNotes;
          renderNotes();
          return;
        }
      } catch (error) {
        console.error('Error fetching notes from API:', error);
        // Fall back to empty notes
      }
    }
    
    // No notes available
    notes = [];
    renderNotes();
  } catch (error) {
    console.error('Error loading notes:', error);
    notesLoadingElement.innerHTML = `
      <div class="alert alert-error">
        Error loading notes. Please try again later.
      </div>
    `;
  }
}

/**
 * Load highlights for the article
 * @param {string} articleId - The ID of the article
 */
async function loadHighlights(articleId) {
  try {
    highlightsLoadingElement.classList.remove('hidden');
    highlightsEmptyElement.classList.add('hidden');
    highlightsListElement.classList.add('hidden');
    
    // Try to get from API if authenticated
    if (isAuthenticated) {
      try {
        const response = await fetch(`${API_BASE_URL}/highlights/article/${articleId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          const { highlights: apiHighlights } = await response.json();
          highlights = apiHighlights;
          renderHighlights();
          return;
        }
      } catch (error) {
        console.error('Error fetching highlights from API:', error);
        // Fall back to empty highlights
      }
    }
    
    // No highlights available
    highlights = [];
    renderHighlights();
  } catch (error) {
    console.error('Error loading highlights:', error);
    highlightsLoadingElement.innerHTML = `
      <div class="alert alert-error">
        Error loading highlights. Please try again later.
      </div>
    `;
  }
}

/**
 * Render notes in the UI
 */
function renderNotes() {
  notesLoadingElement.classList.add('hidden');
  
  if (notes.length === 0) {
    notesEmptyElement.classList.remove('hidden');
    notesListElement.classList.add('hidden');
    return;
  }
  
  notesEmptyElement.classList.add('hidden');
  notesListElement.classList.remove('hidden');
  notesListElement.innerHTML = '';
  
  // Sort notes by creation date (newest first)
  const sortedNotes = [...notes].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  sortedNotes.forEach(note => {
    const noteElement = createNoteElement(note);
    notesListElement.appendChild(noteElement);
  });
}

/**
 * Create a note element
 * @param {Object} note - The note data
 * @returns {HTMLElement} The note element
 */
function createNoteElement(note) {
  const noteCard = document.createElement('div');
  noteCard.className = 'note-card';
  
  const noteHeader = document.createElement('div');
  noteHeader.className = 'note-header';
  
  const noteDate = document.createElement('div');
  noteDate.className = 'note-date';
  
  // Format date
  const createdDate = new Date(note.createdAt);
  noteDate.textContent = createdDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  noteHeader.appendChild(noteDate);
  
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.textContent = note.noteText;
  
  const noteActions = document.createElement('div');
  noteActions.className = 'note-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn';
  editBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
    Edit
  `;
  editBtn.addEventListener('click', () => {
    openEditNoteModal(note);
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn';
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    Delete
  `;
  deleteBtn.addEventListener('click', () => {
    deleteNote(note._id);
  });
  
  noteActions.appendChild(editBtn);
  noteActions.appendChild(deleteBtn);
  
  noteCard.appendChild(noteHeader);
  noteCard.appendChild(noteContent);
  noteCard.appendChild(noteActions);
  
  return noteCard;
}

/**
 * Render highlights in the UI
 */
function renderHighlights() {
  highlightsLoadingElement.classList.add('hidden');
  
  if (highlights.length === 0) {
    highlightsEmptyElement.classList.remove('hidden');
    highlightsListElement.classList.add('hidden');
    return;
  }
  
  highlightsEmptyElement.classList.add('hidden');
  highlightsListElement.classList.remove('hidden');
  highlightsListElement.innerHTML = '';
  
  // Sort highlights by creation date (newest first)
  const sortedHighlights = [...highlights].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  sortedHighlights.forEach(highlight => {
    const highlightElement = createHighlightElement(highlight);
    highlightsListElement.appendChild(highlightElement);
  });
}

/**
 * Create a highlight element
 * @param {Object} highlight - The highlight data
 * @returns {HTMLElement} The highlight element
 */
function createHighlightElement(highlight) {
  const highlightCard = document.createElement('div');
  highlightCard.className = 'highlight-card';
  
  const highlightHeader = document.createElement('div');
  highlightHeader.className = 'highlight-header';
  
  const highlightDate = document.createElement('div');
  highlightDate.className = 'highlight-date';
  
  // Format date
  const createdDate = new Date(highlight.createdAt);
  highlightDate.textContent = createdDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  highlightHeader.appendChild(highlightDate);
  
  const highlightText = document.createElement('div');
  highlightText.className = 'highlight-text';
  highlightText.style.backgroundColor = getHighlightColor(highlight.color);
  highlightText.textContent = highlight.selectedText;
  
  // Check if there's a note associated with this highlight
  const associatedNote = notes.find(note => note.highlightId === highlight._id);
  
  if (associatedNote) {
    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    noteContent.textContent = associatedNote.noteText;
    highlightCard.appendChild(noteContent);
  }
  
  const highlightActions = document.createElement('div');
  highlightActions.className = 'highlight-actions';
  
  if (!associatedNote) {
    const addNoteBtn = document.createElement('button');
    addNoteBtn.className = 'action-btn';
    addNoteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add Note
    `;
    addNoteBtn.addEventListener('click', () => {
      openAddNoteToHighlightModal(highlight._id);
    });
    highlightActions.appendChild(addNoteBtn);
  }
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn';
  deleteBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
    Delete
  `;
  deleteBtn.addEventListener('click', () => {
    deleteHighlight(highlight._id);
  });
  
  highlightActions.appendChild(deleteBtn);
  
  highlightCard.appendChild(highlightHeader);
  highlightCard.appendChild(highlightText);
  highlightCard.appendChild(highlightActions);
  
  return highlightCard;
}

/**
 * Get the CSS color for a highlight
 * @param {string} color - The highlight color name
 * @returns {string} The CSS color value
 */
function getHighlightColor(color) {
  const colors = {
    yellow: 'rgba(255, 235, 59, 0.5)',
    green: 'rgba(76, 175, 80, 0.5)',
    blue: 'rgba(33, 150, 243, 0.5)',
    pink: 'rgba(233, 30, 99, 0.5)'
  };
  
  return colors[color] || colors.yellow;
}

/**
 * Open the add note modal
 */
function openAddNoteModal() {
  // Reset modal state
  editingNoteId = null;
  noteTextElement.value = '';
  
  // Show modal
  noteModal.classList.remove('hidden');
  noteTextElement.focus();
}

/**
 * Open the edit note modal
 * @param {Object} note - The note to edit
 */
function openEditNoteModal(note) {
  // Set modal state
  editingNoteId = note._id;
  noteTextElement.value = note.noteText;
  
  // Show modal
  noteModal.classList.remove('hidden');
  noteTextElement.focus();
}

/**
 * Open the add note to highlight modal
 * @param {string} highlightId - The ID of the highlight
 */
function openAddNoteToHighlightModal(highlightId) {
  // Reset modal state
  editingNoteId = null;
  noteTextElement.value = '';
  
  // Set highlight ID
  noteModal.dataset.highlightId = highlightId;
  
  // Show modal
  noteModal.classList.remove('hidden');
  noteTextElement.focus();
}

/**
 * Close the note modal
 */
function closeNoteModal() {
  noteModal.classList.add('hidden');
  noteModal.dataset.highlightId = '';
}

/**
 * Save a note
 */
async function saveNote() {
  const noteText = noteTextElement.value.trim();
  
  if (!noteText) {
    alert('Please enter a note');
    return;
  }
  
  try {
    const highlightId = noteModal.dataset.highlightId || null;
    
    if (editingNoteId) {
      // Update existing note
      if (isAuthenticated) {
        const response = await fetch(`${API_BASE_URL}/notes/${editingNoteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ noteText })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update note');
        }
        
        const { note: updatedNote } = await response.json();
        
        // Update notes array
        const noteIndex = notes.findIndex(n => n._id === editingNoteId);
        if (noteIndex >= 0) {
          notes[noteIndex] = updatedNote;
        }
      } else {
        // Local update
        const noteIndex = notes.findIndex(n => n._id === editingNoteId);
        if (noteIndex >= 0) {
          notes[noteIndex].noteText = noteText;
          notes[noteIndex].updatedAt = new Date().toISOString();
        }
      }
    } else {
      // Create new note
      if (isAuthenticated) {
        const response = await fetch(`${API_BASE_URL}/notes/article/${article._id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            noteText,
            highlightId
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create note');
        }
        
        const { note: newNote } = await response.json();
        
        // Add to notes array
        notes.push(newNote);
      } else {
        // Local creation
        const newNote = {
          _id: `local-${Date.now()}`,
          articleId: article._id,
          highlightId,
          noteText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        notes.push(newNote);
      }
    }
    
    // Close modal
    closeNoteModal();
    
    // Re-render notes
    renderNotes();
    
    // Re-render highlights if adding a note to a highlight
    if (highlightId) {
      renderHighlights();
    }
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Error saving note. Please try again.');
  }
}

/**
 * Delete a note
 * @param {string} noteId - The ID of the note to delete
 */
async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this note?')) {
    return;
  }
  
  try {
    if (isAuthenticated && !noteId.startsWith('local-')) {
      const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
    }
    
    // Remove from notes array
    notes = notes.filter(note => note._id !== noteId);
    
    // Re-render notes
    renderNotes();
    
    // Re-render highlights if the note was associated with a highlight
    const deletedNote = notes.find(note => note._id === noteId);
    if (deletedNote && deletedNote.highlightId) {
      renderHighlights();
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Error deleting note. Please try again.');
  }
}

/**
 * Delete a highlight
 * @param {string} highlightId - The ID of the highlight to delete
 */
async function deleteHighlight(highlightId) {
  if (!confirm('Are you sure you want to delete this highlight?')) {
    return;
  }
  
  try {
    if (isAuthenticated && !highlightId.startsWith('local-')) {
      const response = await fetch(`${API_BASE_URL}/highlights/${highlightId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete highlight');
      }
    }
    
    // Remove from highlights array
    highlights = highlights.filter(highlight => highlight._id !== highlightId);
    
    // Remove associated notes
    notes = notes.filter(note => note.highlightId !== highlightId);
    
    // Re-render highlights and notes
    renderHighlights();
    renderNotes();
  } catch (error) {
    console.error('Error deleting highlight:', error);
    alert('Error deleting highlight. Please try again.');
  }
}

/**
 * Show an error message
 * @param {string} message - The error message
 */
function showError(message) {
  const container = document.querySelector('.container');
  
  // Clear container
  container.innerHTML = '';
  
  // Create error message
  const errorElement = document.createElement('div');
  errorElement.className = 'alert alert-error';
  errorElement.style.marginTop = '32px';
  errorElement.textContent = message;
  
  // Create back button
  const backButton = document.createElement('button');
  backButton.className = 'primary-btn';
  backButton.style.marginTop = '16px';
  backButton.textContent = 'Back to Reading List';
  backButton.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('pages/reading-list.html');
  });
  
  // Add to container
  container.appendChild(errorElement);
  container.appendChild(backButton);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Back to list button
  backToListBtn.addEventListener('click', () => {
    window.location.href = chrome.runtime.getURL('pages/reading-list.html');
  });
  
  // Add note button
  addNoteBtn.addEventListener('click', openAddNoteModal);
  
  // Modal close button
  closeModalBtn.addEventListener('click', closeNoteModal);
  
  // Cancel note button
  cancelNoteBtn.addEventListener('click', closeNoteModal);
  
  // Save note button
  saveNoteBtn.addEventListener('click', saveNote);
  
  // Close modal when clicking outside
  noteModal.addEventListener('click', (e) => {
    if (e.target === noteModal) {
      closeNoteModal();
    }
  });
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !noteModal.classList.contains('hidden')) {
      closeNoteModal();
    }
  });
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);
