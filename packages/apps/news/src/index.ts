import express from 'express';
import cors from 'cors';
import { articles } from './data/articles.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all articles (list view with metadata only)
app.get('/api/articles', (req, res) => {
  const articlesWithoutContent = articles.map(({ content, ...metadata }) => metadata);
  res.json(articlesWithoutContent);
});

// Get single article by slug (includes full content)
app.get('/api/articles/:slug', (req, res) => {
  const { slug } = req.params;
  const article = articles.find(a => a.slug === slug);
  
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  
  res.json(article);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`News server running on port ${PORT}`);
  console.log(`- Articles: http://localhost:${PORT}/api/articles`);
  console.log(`- Health: http://localhost:${PORT}/health`);
});
