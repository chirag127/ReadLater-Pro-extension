/**
 * Articles Routes
 * Defines API endpoints for article-related operations
 */

const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articlesController');

// GET /articles - Get all articles for the authenticated user
router.get('/', articlesController.getArticles);

// GET /articles/:id - Get a single article by ID
router.get('/:id', articlesController.getArticleById);

// POST /articles - Create a new article
router.post('/', articlesController.createArticle);

// PUT /articles/:id - Update an article
router.put('/:id', articlesController.updateArticle);

// PUT /articles/:id/progress - Update article progress
router.put('/:id/progress', articlesController.updateProgress);

// PUT /articles/:id/tags - Update article tags
router.put('/:id/tags', articlesController.updateTags);

// DELETE /articles/:id - Delete an article
router.delete('/:id', articlesController.deleteArticle);

// POST /articles/sync - Sync articles between local storage and server
router.post('/sync', articlesController.syncArticles);

module.exports = router;
