/**
 * Article Controller Tests
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const articlesController = require('../controllers/articlesController');
const Article = require('../models/Article');

let mongoServer;

// Mock request and response objects
const mockRequest = (params = {}, body = {}, auth = {}) => ({
  params,
  body,
  auth
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Setup and teardown
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Article.deleteMany({});
});

describe('Articles Controller', () => {
  describe('getArticles', () => {
    it('should return articles for the authenticated user', async () => {
      // Create test articles
      await Article.create([
        {
          userId: 'user1',
          url: 'https://example.com/article1',
          title: 'Article 1',
          domain: 'example.com',
          savedAt: new Date(),
          tags: ['tag1', 'tag2']
        },
        {
          userId: 'user1',
          url: 'https://example.com/article2',
          title: 'Article 2',
          domain: 'example.com',
          savedAt: new Date(),
          tags: ['tag2', 'tag3']
        },
        {
          userId: 'user2',
          url: 'https://example.com/article3',
          title: 'Article 3',
          domain: 'example.com',
          savedAt: new Date()
        }
      ]);
      
      const req = mockRequest({}, {}, { userId: 'user1' });
      const res = mockResponse();
      const next = jest.fn();
      
      await articlesController.getArticles(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.articles).toHaveLength(2);
      expect(responseData.articles[0].userId).toBe('user1');
      expect(responseData.articles[1].userId).toBe('user1');
    });
    
    it('should filter articles by tag', async () => {
      // Create test articles
      await Article.create([
        {
          userId: 'user1',
          url: 'https://example.com/article1',
          title: 'Article 1',
          domain: 'example.com',
          savedAt: new Date(),
          tags: ['tag1', 'tag2']
        },
        {
          userId: 'user1',
          url: 'https://example.com/article2',
          title: 'Article 2',
          domain: 'example.com',
          savedAt: new Date(),
          tags: ['tag2', 'tag3']
        }
      ]);
      
      const req = mockRequest({}, {}, { userId: 'user1' });
      req.query = { tag: 'tag1' };
      
      const res = mockResponse();
      const next = jest.fn();
      
      await articlesController.getArticles(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.articles).toHaveLength(1);
      expect(responseData.articles[0].url).toBe('https://example.com/article1');
    });
  });
  
  describe('createArticle', () => {
    it('should create a new article', async () => {
      const articleData = {
        url: 'https://example.com/article1',
        title: 'Article 1',
        domain: 'example.com',
        contentSnippet: 'This is a test article',
        estimatedReadingTimeMinutes: 5
      };
      
      const req = mockRequest({}, articleData, { userId: 'user1' });
      const res = mockResponse();
      const next = jest.fn();
      
      await articlesController.createArticle(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.article.url).toBe(articleData.url);
      expect(responseData.article.title).toBe(articleData.title);
      expect(responseData.article.userId).toBe('user1');
      
      // Verify it was saved to the database
      const savedArticle = await Article.findOne({ url: articleData.url });
      expect(savedArticle).not.toBeNull();
      expect(savedArticle.userId).toBe('user1');
    });
    
    it('should update an existing article if URL already exists', async () => {
      // Create an existing article
      const existingArticle = await Article.create({
        userId: 'user1',
        url: 'https://example.com/article1',
        title: 'Original Title',
        domain: 'example.com',
        savedAt: new Date()
      });
      
      const updatedData = {
        url: 'https://example.com/article1',
        title: 'Updated Title',
        domain: 'example.com',
        contentSnippet: 'This is an updated article'
      };
      
      const req = mockRequest({}, updatedData, { userId: 'user1' });
      const res = mockResponse();
      const next = jest.fn();
      
      await articlesController.createArticle(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Verify it was updated in the database
      const updatedArticle = await Article.findById(existingArticle._id);
      expect(updatedArticle.title).toBe('Updated Title');
      expect(updatedArticle.contentSnippet).toBe('This is an updated article');
    });
  });
  
  describe('updateProgress', () => {
    it('should update article progress', async () => {
      // Create an article
      const article = await Article.create({
        userId: 'user1',
        url: 'https://example.com/article1',
        title: 'Article 1',
        domain: 'example.com',
        savedAt: new Date(),
        progressPercent: 0,
        status: 'unread'
      });
      
      const progressData = {
        scrollPosition: {
          type: 'pixel',
          value: 500
        },
        progressPercent: 75
      };
      
      const req = mockRequest({ id: article._id }, progressData, { userId: 'user1' });
      const res = mockResponse();
      const next = jest.fn();
      
      await articlesController.updateProgress(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      
      // Verify it was updated in the database
      const updatedArticle = await Article.findById(article._id);
      expect(updatedArticle.progressPercent).toBe(75);
      expect(updatedArticle.status).toBe('in-progress');
      expect(updatedArticle.scrollPosition.value).toBe(500);
    });
    
    it('should update status to finished when progress is 100%', async () => {
      // Create an article
      const article = await Article.create({
        userId: 'user1',
        url: 'https://example.com/article1',
        title: 'Article 1',
        domain: 'example.com',
        savedAt: new Date(),
        progressPercent: 50,
        status: 'in-progress'
      });
      
      const progressData = {
        scrollPosition: {
          type: 'pixel',
          value: 1000
        },
        progressPercent: 100
      };
      
      const req = mockRequest({ id: article._id }, progressData, { userId: 'user1' });
      const res = mockResponse();
      const next = jest.fn();
      
      await articlesController.updateProgress(req, res, next);
      
      // Verify it was updated in the database
      const updatedArticle = await Article.findById(article._id);
      expect(updatedArticle.progressPercent).toBe(100);
      expect(updatedArticle.status).toBe('finished');
    });
  });
});
