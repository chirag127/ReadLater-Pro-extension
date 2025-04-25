/**
 * Highlights Routes
 * Defines API endpoints for highlight-related operations
 */

const express = require('express');
const router = express.Router();
const highlightsController = require('../controllers/highlightsController');

// GET /highlights/article/:articleId - Get all highlights for an article
router.get('/article/:articleId', highlightsController.getHighlights);

// POST /highlights/article/:articleId - Create a new highlight
router.post('/article/:articleId', highlightsController.createHighlight);

// PUT /highlights/:highlightId - Update a highlight
router.put('/:highlightId', highlightsController.updateHighlight);

// DELETE /highlights/:highlightId - Delete a highlight
router.delete('/:highlightId', highlightsController.deleteHighlight);

module.exports = router;
