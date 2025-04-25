/**
 * Highlights Controller
 * Handles business logic for highlight-related operations
 */

const Highlight = require('../models/Highlight');
const Article = require('../models/Article');

/**
 * Get all highlights for an article
 */
exports.getHighlights = async (req, res, next) => {
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
    
    // Get highlights
    const highlights = await Highlight.find({
      articleId,
      userId
    }).sort({ createdAt: 1 });
    
    res.status(200).json({ highlights });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new highlight
 */
exports.createHighlight = async (req, res, next) => {
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
    
    // Create highlight
    const highlight = new Highlight({
      ...req.body,
      userId,
      articleId
    });
    
    await highlight.save();
    
    res.status(201).json({
      highlight,
      message: 'Highlight created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a highlight
 */
exports.updateHighlight = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { highlightId } = req.params;
    
    // Ensure the highlight exists and belongs to the user
    const highlight = await Highlight.findOne({
      _id: highlightId,
      userId
    });
    
    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    // Update highlight
    const updatedHighlight = await Highlight.findByIdAndUpdate(
      highlightId,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json({
      highlight: updatedHighlight,
      message: 'Highlight updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a highlight
 */
exports.deleteHighlight = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { highlightId } = req.params;
    
    // Ensure the highlight exists and belongs to the user
    const highlight = await Highlight.findOne({
      _id: highlightId,
      userId
    });
    
    if (!highlight) {
      return res.status(404).json({ error: 'Highlight not found' });
    }
    
    // Delete highlight
    await Highlight.findByIdAndDelete(highlightId);
    
    res.status(200).json({
      message: 'Highlight deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
