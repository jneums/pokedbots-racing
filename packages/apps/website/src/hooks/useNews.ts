import { useQuery } from '@tanstack/react-query';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

export interface NewsArticleMetadata {
  title: string;
  description?: string;
  author?: string;
  date?: string;
  slug: string;
}

export interface NewsArticle {
  slug: string;
  metadata: NewsArticleMetadata;
  content: string;
}

async function processMarkdown(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);
  return result.toString();
}

// Get the news API URL based on environment
const NEWS_API_URL = process.env.NEWS_API_URL || 'http://localhost:3001/api';

async function fetchNewsArticles(): Promise<NewsArticle[]> {
  const response = await fetch(`${NEWS_API_URL}/articles`);
  if (!response.ok) {
    throw new Error('Failed to fetch news articles');
  }
  const data = await response.json();
  
  // Process articles with markdown rendering
  const processedArticles = await Promise.all(
    data.map(async (article: any) => ({
      slug: article.slug,
      metadata: {
        title: article.title,
        description: article.description,
        author: article.author,
        date: article.date,
        slug: article.slug,
      },
      content: await processMarkdown(article.content || ''),
    }))
  );
  
  return processedArticles;
}

async function fetchNewsArticle(slug: string): Promise<NewsArticle> {
  const response = await fetch(`${NEWS_API_URL}/articles/${slug}`);
  if (!response.ok) {
    throw new Error('Failed to fetch news article');
  }
  const article = await response.json();
  
  return {
    slug: article.slug,
    metadata: {
      title: article.title,
      description: article.description,
      author: article.author,
      date: article.date,
      slug: article.slug,
    },
    content: await processMarkdown(article.content || ''),
  };
}

export function useNewsArticles() {
  return useQuery({
    queryKey: ['news-articles'],
    queryFn: fetchNewsArticles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNewsArticle(slug: string) {
  return useQuery({
    queryKey: ['news-article', slug],
    queryFn: () => fetchNewsArticle(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
