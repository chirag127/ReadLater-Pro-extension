/**
 * Reading List script for ReadLater Pro extension
 * Handles displaying, filtering, and managing saved articles
 */

// API endpoint
const API_BASE_URL = "https://api.readlaterpro.com";

// DOM Elements
const loggedOutSection = document.getElementById("logged-out");
const loggedInSection = document.getElementById("logged-in");
const userAvatarElement = document.getElementById("user-avatar");
const userNameElement = document.getElementById("user-name");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const sortSelect = document.getElementById("sort-select");
const tagFilter = document.getElementById("tag-filter");

const loadingElement = document.getElementById("loading");
const emptyStateElement = document.getElementById("empty-state");
const articlesListElement = document.getElementById("articles-list");

const paginationElement = document.getElementById("pagination");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageInfoElement = document.getElementById("page-info");

// State
let articles = [];
let filteredArticles = [];
let allTags = new Set();
let isAuthenticated = false;
let userInfo = null;
let authToken = null;
let currentPage = 1;
let itemsPerPage = 12;
let currentSort = "savedAt-desc";
let currentTagFilter = "";
let currentSearchQuery = "";

/**
 * Initialize the reading list
 */
async function initialize() {
    // Check authentication status
    const { token, userInfo: storedUserInfo } = await chrome.storage.local.get([
        "token",
        "userInfo",
    ]);

    if (token && storedUserInfo) {
        isAuthenticated = true;
        userInfo = storedUserInfo;
        authToken = token;
        updateAuthUI();
    } else {
        loggedOutSection.classList.remove("hidden");
    }

    // Load articles
    await loadArticles();

    // Set up event listeners
    setupEventListeners();
}

/**
 * Update the authentication UI based on login state
 */
function updateAuthUI() {
    if (isAuthenticated && userInfo) {
        loggedOutSection.classList.add("hidden");
        loggedInSection.classList.remove("hidden");

        userAvatarElement.src =
            userInfo.imageUrl || "../assets/default-avatar.png";
        userNameElement.textContent = userInfo.firstName
            ? `${userInfo.firstName} ${userInfo.lastName || ""}`
            : userInfo.email;
    } else {
        loggedOutSection.classList.remove("hidden");
        loggedInSection.classList.add("hidden");
    }
}

/**
 * Load articles from storage or API
 */
async function loadArticles() {
    try {
        // Show loading
        loadingElement.classList.remove("hidden");
        articlesListElement.classList.add("hidden");
        emptyStateElement.classList.add("hidden");

        // Get articles from local storage
        const { articles: storedArticles = [] } =
            await chrome.storage.local.get("articles");

        // If authenticated, try to fetch from API
        if (isAuthenticated && authToken) {
            try {
                const response = await fetch(`${API_BASE_URL}/articles`, {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                    },
                });

                if (response.ok) {
                    const { articles: apiArticles } = await response.json();
                    articles = apiArticles;

                    // Update local storage
                    await chrome.storage.local.set({ articles });
                } else {
                    // Use stored articles if API fails
                    articles = storedArticles;
                }
            } catch (error) {
                console.error("Error fetching articles from API:", error);
                // Use stored articles if API fails
                articles = storedArticles;
            }
        } else {
            // Use stored articles if not authenticated
            articles = storedArticles;
        }

        // Extract all tags
        extractTags();

        // Apply initial filters and sorting
        applyFilters();

        // Hide loading
        loadingElement.classList.add("hidden");

        // Show empty state or articles
        if (filteredArticles.length === 0) {
            emptyStateElement.classList.remove("hidden");
        } else {
            articlesListElement.classList.remove("hidden");
        }
    } catch (error) {
        console.error("Error loading articles:", error);
        loadingElement.innerHTML = `
      <div class="alert alert-error">
        Error loading articles. Please try again later.
      </div>
    `;
    }
}

/**
 * Extract all unique tags from articles
 */
function extractTags() {
    allTags = new Set();

    articles.forEach((article) => {
        if (article.tags && Array.isArray(article.tags)) {
            article.tags.forEach((tag) => allTags.add(tag));
        }
    });

    // Update tag filter options
    updateTagFilterOptions();
}

/**
 * Update tag filter dropdown options
 */
function updateTagFilterOptions() {
    // Clear existing options except the first one
    while (tagFilter.options.length > 1) {
        tagFilter.remove(1);
    }

    // Add options for each tag
    Array.from(allTags)
        .sort()
        .forEach((tag) => {
            const option = document.createElement("option");
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });
}

/**
 * Apply filters and sorting to articles
 */
function applyFilters() {
    // Filter by search query
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filteredArticles = articles.filter(
            (article) =>
                article.title.toLowerCase().includes(query) ||
                (article.contentSnippet &&
                    article.contentSnippet.toLowerCase().includes(query)) ||
                (article.tags &&
                    article.tags.some((tag) =>
                        tag.toLowerCase().includes(query)
                    ))
        );
    } else {
        filteredArticles = [...articles];
    }

    // Filter by tag
    if (currentTagFilter) {
        filteredArticles = filteredArticles.filter(
            (article) => article.tags && article.tags.includes(currentTagFilter)
        );
    }

    // Apply sorting
    const [sortField, sortDirection] = currentSort.split("-");

    filteredArticles.sort((a, b) => {
        let valueA = a[sortField];
        let valueB = b[sortField];

        // Handle missing values
        if (valueA === undefined || valueA === null)
            valueA = sortDirection === "asc" ? Infinity : -Infinity;
        if (valueB === undefined || valueB === null)
            valueB = sortDirection === "asc" ? Infinity : -Infinity;

        // Handle dates
        if (sortField === "savedAt") {
            valueA = new Date(valueA).getTime();
            valueB = new Date(valueB).getTime();
        }

        // Sort based on direction
        if (sortDirection === "asc") {
            return valueA - valueB;
        } else {
            return valueB - valueA;
        }
    });

    // Reset to first page
    currentPage = 1;

    // Render articles and pagination
    renderArticles();
    renderPagination();
}

/**
 * Render articles in the list
 */
function renderArticles() {
    articlesListElement.innerHTML = "";

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

    // Show empty state if no articles
    if (paginatedArticles.length === 0) {
        articlesListElement.classList.add("hidden");
        emptyStateElement.classList.remove("hidden");
        return;
    }

    // Show articles
    articlesListElement.classList.remove("hidden");
    emptyStateElement.classList.add("hidden");

    // Create article cards
    paginatedArticles.forEach((article) => {
        const articleCard = createArticleCard(article);
        articlesListElement.appendChild(articleCard);
    });
}

/**
 * Create an article card element
 * @param {Object} article - The article data
 * @returns {HTMLElement} The article card element
 */
function createArticleCard(article) {
    const card = document.createElement("div");
    card.className = "article-card";

    // Format date
    const savedDate = new Date(article.savedAt);
    const formattedDate = savedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    // Create header
    const header = document.createElement("div");
    header.className = "article-header";

    const title = document.createElement("h3");
    title.className = "article-title";
    title.textContent = article.title;

    const meta = document.createElement("div");
    meta.className = "article-meta";

    const domain = document.createElement("span");
    domain.textContent = article.domain;

    const date = document.createElement("span");
    date.textContent = formattedDate;

    meta.appendChild(domain);
    meta.appendChild(date);

    header.appendChild(title);
    header.appendChild(meta);

    // Create content
    const content = document.createElement("div");
    content.className = "article-content";

    if (article.contentSnippet) {
        const snippet = document.createElement("div");
        snippet.className = "article-snippet";
        snippet.textContent = article.contentSnippet;
        content.appendChild(snippet);
    }

    // Add tags if available
    if (article.tags && article.tags.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "article-tags";

        article.tags.forEach((tag) => {
            const tagElement = document.createElement("span");
            tagElement.className = "tag";
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });

        content.appendChild(tagsContainer);
    }

    // Create footer
    const footer = document.createElement("div");
    footer.className = "article-footer";

    // Progress bar
    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-container";

    const progressLabel = document.createElement("div");
    progressLabel.className = "progress-label";

    const progressText = document.createElement("span");
    progressText.textContent = "Progress:";

    const progressPercent = document.createElement("span");
    progressPercent.textContent = `${article.progressPercent || 0}%`;

    progressLabel.appendChild(progressText);
    progressLabel.appendChild(progressPercent);

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "progress-fill";
    progressFill.style.width = `${article.progressPercent || 0}%`;

    progressBar.appendChild(progressFill);

    progressContainer.appendChild(progressLabel);
    progressContainer.appendChild(progressBar);

    // Actions
    const actions = document.createElement("div");
    actions.className = "article-actions";

    const readBtn = document.createElement("button");
    readBtn.className = "action-btn";
    readBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    readBtn.title = "Read Article";
    readBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        chrome.tabs.create({ url: article.url });
    });

    const notesBtn = document.createElement("button");
    notesBtn.className = "action-btn";
    notesBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
    notesBtn.title = "View Notes";
    notesBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openNotesPage(article._id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn";
    deleteBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
    deleteBtn.title = "Delete Article";
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteArticle(article);
    });

    actions.appendChild(readBtn);
    actions.appendChild(notesBtn);
    actions.appendChild(deleteBtn);

    footer.appendChild(progressContainer);
    footer.appendChild(actions);

    // Assemble card
    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(footer);

    // Add click event to open the article
    card.addEventListener("click", () => {
        chrome.tabs.create({ url: article.url });
    });

    return card;
}

/**
 * Render pagination controls
 */
function renderPagination() {
    const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);

    if (totalPages <= 1) {
        paginationElement.classList.add("hidden");
        return;
    }

    paginationElement.classList.remove("hidden");
    pageInfoElement.textContent = `Page ${currentPage} of ${totalPages}`;

    // Update button states
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

/**
 * Delete an article
 * @param {Object} article - The article to delete
 */
async function deleteArticle(article) {
    if (!confirm(`Are you sure you want to delete "${article.title}"?`)) {
        return;
    }

    try {
        // Delete from API if authenticated
        if (isAuthenticated && authToken && article._id) {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/articles/${article._id}`,
                    {
                        method: "DELETE",
                        headers: {
                            Authorization: `Bearer ${authToken}`,
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error("Failed to delete article from server");
                }
            } catch (error) {
                console.error("Error deleting article from API:", error);
                // Continue with local deletion even if API fails
            }
        }

        // Delete from local storage
        const { articles: storedArticles = [] } =
            await chrome.storage.local.get("articles");
        const updatedArticles = storedArticles.filter(
            (a) => a.url !== article.url
        );
        await chrome.storage.local.set({ articles: updatedArticles });

        // Update local state
        articles = articles.filter((a) => a.url !== article.url);

        // Re-apply filters and render
        applyFilters();

        // Show success message
        alert("Article deleted successfully");
    } catch (error) {
        console.error("Error deleting article:", error);
        alert("Error deleting article. Please try again.");
    }
}

/**
 * Open the login page
 */
function openLoginPage() {
    window.location.href = chrome.runtime.getURL("pages/auth.html");
}

/**
 * Log out the current user
 */
async function logout() {
    try {
        await chrome.runtime.sendMessage({ action: "clearAuthToken" });
        await chrome.storage.local.remove(["token", "userInfo"]);

        isAuthenticated = false;
        userInfo = null;
        authToken = null;

        updateAuthUI();

        // Reload articles (will use local storage only)
        await loadArticles();
    } catch (error) {
        console.error("Error logging out:", error);
        alert("Error logging out. Please try again.");
    }
}

/**
 * Handle search
 */
function handleSearch() {
    currentSearchQuery = searchInput.value.trim();
    applyFilters();
}

/**
 * Handle sort change
 */
function handleSortChange() {
    currentSort = sortSelect.value;
    applyFilters();
}

/**
 * Handle tag filter change
 */
function handleTagFilterChange() {
    currentTagFilter = tagFilter.value;
    applyFilters();
}

/**
 * Go to previous page
 */
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderArticles();
        renderPagination();
        window.scrollTo(0, 0);
    }
}

/**
 * Go to next page
 */
function goToNextPage() {
    const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderArticles();
        renderPagination();
        window.scrollTo(0, 0);
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Auth buttons
    loginBtn.addEventListener("click", openLoginPage);
    logoutBtn.addEventListener("click", logout);

    // Search
    searchBtn.addEventListener("click", handleSearch);
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    });

    // Filters
    sortSelect.addEventListener("change", handleSortChange);
    tagFilter.addEventListener("change", handleTagFilterChange);

    // Pagination
    prevPageBtn.addEventListener("click", goToPrevPage);
    nextPageBtn.addEventListener("click", goToNextPage);
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", initialize);
