/**
 * Articles Controller
 * Handles business logic for article-related operations
 */

const Article = require('../models/Article');
const Highlight = require('../models/Highlight');
const Note = require('../models/Note');

/**
 * Get all articles for the authenticated user
 */
exports.getArticles = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    
    // Get query parameters
    const { sort, tag, search, status, limit = 50, page = 1 } = req.query;
    
    // Build query
    const query = { userId };
    
    // Filter by tag
    if (tag) {
      query.tags = tag;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Search in title or content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { contentSnippet: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort options
    let sortOptions = { savedAt: -1 }; // Default sort
    
    if (sort) {
      const [field, direction] = sort.split('-');
      sortOptions = {
        [field]: direction === 'asc' ? 1 : -1
      };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Execute query
    const articles = await Article.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    // Get total count for pagination
    const total = await Article.countDocuments(query);
    
    res.status(200).json({
      articles,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single article by ID
 */
exports.getArticleById = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const articleId = req.params.id;
    
    const article = await Article.findOne({
      _id: articleId,
      userId
    }).lean();
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Update last accessed timestamp
    await Article.updateOne(
      { _id: articleId },
      { $set: { lastAccessedAt: new Date() } }
    );
    
    res.status(200).json({ article });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new article
 */
exports.createArticle = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    
    // Check if article already exists
    const existingArticle = await Article.findOne({
      userId,
      url: req.body.url
    });
    
    if (existingArticle) {
      // Update existing article
      const updatedArticle = await Article.findByIdAndUpdate(
        existingArticle._id,
        {
          $set: {
            ...req.body,
            userId // Ensure userId is set correctly
          }
        },
        { new: true }
      );
      
      return res.status(200).json({
        article: updatedArticle,
        message: 'Article updated successfully'
      });
    }
    
    // Create new article
    const article = new Article({
      ...req.body,
      userId
    });
    
    await article.save();
    
    res.status(201).json({
      article,
      message: 'Article saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an article
 */
exports.updateArticle = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const articleId = req.params.id;
    
    // Ensure the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Update the article
    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      { $set: req.body },
      { new: true }
    );
    
    res.status(200).json({
      article: updatedArticle,
      message: 'Article updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update article progress
 */
exports.updateProgress = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const articleId = req.params.id;
    
    // Ensure the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Update progress
    const { scrollPosition, progressPercent } = req.body;
    
    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      {
        $set: {
          scrollPosition,
          progressPercent,
          lastAccessedAt: new Date()
        }
      },
      { new: true }
    );
    
    // Update status based on progress
    if (progressPercent > 0 && progressPercent < 100 && article.status === 'unread') {
      updatedArticle.status = 'in-progress';
      await updatedArticle.save();
    } else if (progressPercent >= 100 && article.status !== 'finished') {
      updatedArticle.status = 'finished';
      await updatedArticle.save();
    }
    
    res.status(200).json({
      article: updatedArticle,
      message: 'Progress updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update article tags
 */
exports.updateTags = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const articleId = req.params.id;
    
    // Ensure the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Update tags
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags must be an array' });
    }
    
    const updatedArticle = await Article.findByIdAndUpdate(
      articleId,
      { $set: { tags } },
      { new: true }
    );
    
    res.status(200).json({
      article: updatedArticle,
      message: 'Tags updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an article
 */
exports.deleteArticle = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const articleId = req.params.id;
    
    // Ensure the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleId,
      userId
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Delete associated highlights and notes
    await Highlight.deleteMany({ articleId });
    await Note.deleteMany({ articleId });
    
    // Delete the article
    await Article.findByIdAndDelete(articleId);
    
    res.status(200).json({
      message: 'Article deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync articles between local storage and server
 */
exports.syncArticles = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const { articles: localArticles } = req.body;
    
    if (!Array.isArray(localArticles)) {
      return res.status(400).json({ error: 'Articles must be an array' });
    }
    
    // Get all user's articles from the database
    const dbArticles = await Article.find({ userId }).lean();
    
    // Create a map of database articles by URL for quick lookup
    const dbArticlesByUrl = {};
    dbArticles.forEach(article => {
      dbArticlesByUrl[article.url] = article;
    });
    
    // Process each local article
    const syncedArticles = [];
    const operations = [];
    
    for (const localArticle of localArticles) {
      const dbArticle = dbArticlesByUrl[localArticle.url];
      
      if (dbArticle) {
        // Article exists in the database
        // Determine which version is newer
        const localUpdatedAt = localArticle.updatedAt ? new Date(localArticle.updatedAt) : new Date(0);
        const dbUpdatedAt = dbArticle.updatedAt;
        
        if (localUpdatedAt > dbUpdatedAt) {
          // Local version is newer, update database
          operations.push(
            Article.updateOne(
              { _id: dbArticle._id },
              {
                $set: {
                  ...localArticle,
                  userId, // Ensure userId is set correctly
                  _id: dbArticle._id // Keep the same ID
                }
              }
            )
          );
          
          syncedArticles.push({
            ...localArticle,
            _id: dbArticle._id
          });
        } else {
          // Database version is newer or same, use it
          syncedArticles.push(dbArticle);
        }
      } else {
        // Article doesn't exist in the database, create it
        const newArticle = new Article({
          ...localArticle,
          userId
        });
        
        operations.push(newArticle.save());
        syncedArticles.push(newArticle);
      }
    }
    
    // Check for articles in the database that aren't in local storage
    dbArticles.forEach(dbArticle => {
      const localArticle = localArticles.find(a => a.url === dbArticle.url);
      
      if (!localArticle) {
        // Article exists in the database but not locally, add it to synced articles
        syncedArticles.push(dbArticle);
      }
    });
    
    // Execute all database operations
    await Promise.all(operations);
    
    res.status(200).json({
      syncedArticles,
      message: 'Articles synced successfully'
    });
  } catch (error) {
    next(error);
  }
};
