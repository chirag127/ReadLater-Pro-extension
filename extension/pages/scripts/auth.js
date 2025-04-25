/**
 * Authentication script for ReadLater Pro extension
 * Handles Clerk authentication and token management
 */

// DOM Elements
const clerkAuthElement = document.getElementById('clerk-auth');
const loadingElement = document.getElementById('loading');

// API endpoint
const API_BASE_URL = 'https://api.readlaterpro.com';

/**
 * Initialize Clerk authentication
 */
async function initializeClerk() {
  try {
    // Initialize Clerk with your publishable key
    const clerk = window.Clerk;
    
    await clerk.load({
      // Replace with your actual Clerk publishable key
      publishableKey: 'pk_test_YOUR_CLERK_PUBLISHABLE_KEY',
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href
    });
    
    // Show the auth component and hide loading
    clerkAuthElement.classList.remove('hidden');
    loadingElement.classList.add('hidden');
    
    // Mount the Clerk component
    const mountAuth = () => {
      clerk.mountSignIn(clerkAuthElement);
    };
    
    // Check if user is already signed in
    if (clerk.user) {
      // User is signed in, get the token
      const token = await clerk.session.getToken();
      
      // Save the token and user info
      await saveAuthData(token, clerk.user);
      
      // Redirect to reading list
      window.location.href = chrome.runtime.getURL('pages/reading-list.html');
    } else {
      // User is not signed in, show the sign-in component
      mountAuth();
      
      // Listen for auth state changes
      clerk.addListener(({ user }) => {
        if (user) {
          handleSignIn(user);
        }
      });
    }
  } catch (error) {
    console.error('Error initializing Clerk:', error);
    loadingElement.innerHTML = `
      <div class="alert alert-error">
        Error loading authentication. Please try again later.
      </div>
    `;
  }
}

/**
 * Handle successful sign-in
 * @param {Object} user - The Clerk user object
 */
async function handleSignIn(user) {
  try {
    // Show loading
    clerkAuthElement.classList.add('hidden');
    loadingElement.classList.remove('hidden');
    loadingElement.innerHTML = `
      <div class="spinner"></div>
      <p>Signing you in...</p>
    `;
    
    // Get the session token
    const token = await window.Clerk.session.getToken();
    
    // Save the token and user info
    await saveAuthData(token, user);
    
    // Sync data with the server
    await syncData(token);
    
    // Redirect to reading list
    window.location.href = chrome.runtime.getURL('pages/reading-list.html');
  } catch (error) {
    console.error('Error handling sign-in:', error);
    loadingElement.innerHTML = `
      <div class="alert alert-error">
        Error signing in. Please try again later.
      </div>
    `;
  }
}

/**
 * Save authentication data to local storage
 * @param {string} token - The authentication token
 * @param {Object} user - The user object
 */
async function saveAuthData(token, user) {
  try {
    // Extract user info
    const userInfo = {
      id: user.id,
      email: user.primaryEmailAddress.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl
    };
    
    // Save to local storage
    await chrome.storage.local.set({ token, userInfo });
    
    // Notify background script
    await chrome.runtime.sendMessage({
      action: 'setAuthToken',
      token
    });
  } catch (error) {
    console.error('Error saving auth data:', error);
    throw error;
  }
}

/**
 * Sync local data with the server
 * @param {string} token - The authentication token
 */
async function syncData(token) {
  try {
    // Get local articles
    const { articles = [] } = await chrome.storage.local.get('articles');
    
    if (articles.length === 0) {
      // No local articles to sync, fetch from server
      await fetchArticlesFromServer(token);
      return;
    }
    
    // Sync local articles with server
    const response = await fetch(`${API_BASE_URL}/articles/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ articles })
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync articles with server');
    }
    
    const { syncedArticles } = await response.json();
    
    // Update local storage with synced articles
    await chrome.storage.local.set({ articles: syncedArticles });
  } catch (error) {
    console.error('Error syncing data:', error);
    // Continue anyway, we'll try to sync again later
  }
}

/**
 * Fetch articles from the server
 * @param {string} token - The authentication token
 */
async function fetchArticlesFromServer(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/articles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch articles from server');
    }
    
    const { articles } = await response.json();
    
    // Save to local storage
    await chrome.storage.local.set({ articles });
  } catch (error) {
    console.error('Error fetching articles from server:', error);
    // Continue anyway, we'll try again later
  }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', initializeClerk);
