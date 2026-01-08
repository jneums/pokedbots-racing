# PokedBots Racing News Server

Simple Express API server for serving news articles to the PokedBots Racing website.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode (with auto-reload)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/articles` - List all articles (metadata only, no content)
- `GET /api/articles/:slug` - Get single article with full content

## Adding Articles

Edit `src/data/articles.ts` to add new articles. Each article should have:

```typescript
{
  slug: string;        // URL-friendly identifier
  title: string;       // Article title
  description: string; // Short description for listing
  author: string;      // Author name
  date: string;        // ISO date string (YYYY-MM-DD)
  content: string;     // Full markdown content
}
```

## Deployment

Configured for automatic deployment to Render.com via `render.yaml` in the root directory.

### Environment Variables

- `PORT` - Server port (default: 3001, Render sets to 10000)
- `NODE_ENV` - Environment (production/development)

## Tech Stack

- **Express** - Web framework
- **TypeScript** - Type safety
- **esbuild** - Fast bundling
- **tsx** - Development runtime
