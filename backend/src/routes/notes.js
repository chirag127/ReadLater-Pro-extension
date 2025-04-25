/**
 * Notes Routes
 * Defines API endpoints for note-related operations
 */

const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');

// GET /notes/article/:articleId - Get all notes for an article
router.get('/article/:articleId', notesController.getNotes);

// POST /notes/article/:articleId - Create a new note
router.post('/article/:articleId', notesController.createNote);

// PUT /notes/:noteId - Update a note
router.put('/:noteId', notesController.updateNote);

// DELETE /notes/:noteId - Delete a note
router.delete('/:noteId', notesController.deleteNote);

module.exports = router;
