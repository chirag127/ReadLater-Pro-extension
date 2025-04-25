/**
 * Highlight model
 * Represents a text highlight in a saved article
 */

const mongoose = require('mongoose');

const HighlightSchema = new mongoose.Schema({
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
  selectedText: {
    type: String,
    required: true
  },
  selectorInfo: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  color: {
    type: String,
    default: 'yellow'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Highlight', HighlightSchema);
