/**
 * Article model
 * Represents a saved article in the database
 */

const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  contentSnippet: {
    type: String
  },
  estimatedReadingTimeMinutes: {
    type: Number
  },
  wordCount: {
    type: Number
  },
  savedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastAccessedAt: {
    type: Date
  },
  scrollPosition: {
    type: {
      type: String,
      enum: ['pixel', 'percent', 'selector'],
      default: 'pixel'
    },
    value: mongoose.Schema.Types.Mixed
  },
  progressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  tags: {
    type: [String],
    index: true
  },
  status: {
    type: String,
    enum: ['unread', 'in-progress', 'finished', 'archived'],
    default: 'unread'
  }
}, {
  timestamps: true
});

// Compound index for userId and url to ensure uniqueness
ArticleSchema.index({ userId: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('Article', ArticleSchema);
