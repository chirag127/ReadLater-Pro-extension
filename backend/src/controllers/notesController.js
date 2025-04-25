/**
 * Notes Controller
 * Handles business logic for note-related operations
 */

const Note = require('../models/Note');
const Article = require('../models/Article');
const Highlight = require('../models/Highlight');

/**
 * Get all notes for an article
 */
exports.getNotes = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { articleId } = req.params;
    
    // Ensure the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Get notes
    const notes = await Note.find({
      articleId,
      userId
    }).sort({ createdAt: 1 });
    
    res.status(200).json({ notes });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new note
 */
exports.createNote = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { articleId } = req.params;
    const { highlightId, noteText } = req.body;
    
    // Ensure the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // If highlightId is provided, ensure it exists and belongs to the user
    if (highlightId) {
      const highlight = await Highlight.findOne({
        _id: highlightId,
        userId,
        articleId
      });
      
      if (!highlight) {
        return res.status(404).json({ error: 'Highlight not found' });
      }
    }
    
    // Create note
    const note = new Note({
      userId,
      articleId,
      highlightId,
      noteText
    });
    
    await note.save();
    
    res.status(201).json({
      note,
      message: 'Note created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a note
 */
exports.updateNote = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { noteId } = req.params;
    const { noteText } = req.body;
    
    // Ensure the note exists and belongs to the user
    const note = await Note.findOne({
      _id: noteId,
      userId
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Update note
    note.noteText = noteText;
    await note.save();
    
    res.status(200).json({
      note,
      message: 'Note updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a note
 */
exports.deleteNote = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { noteId } = req.params;
    
    // Ensure the note exists and belongs to the user
    const note = await Note.findOne({
      _id: noteId,
      userId
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Delete note
    await Note.findByIdAndDelete(noteId);
    
    res.status(200).json({
      message: 'Note deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
