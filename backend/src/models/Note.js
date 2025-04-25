/**
 * Note model
 * Represents a note associated with an article or highlight
 */

const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true,
    index: true
  },
  highlightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Highlight',
    index: true
  },
  noteText: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Note', NoteSchema);
