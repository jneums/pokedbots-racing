import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

// Add Motoko language support
Prism.languages.motoko = {
  'comment': [
    {
      pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
      lookbehind: true
    },
    {
      pattern: /(^|[^\\:])\/\/.*/,
      lookbehind: true
    }
  ],
  'string': {
    pattern: /"(?:\\.|[^\\"\r\n])*"/,
    greedy: true
  },
  'keyword': /\b(?:actor|and|async|assert|await|break|case|catch|class|continue|debug|debug_show|do|else|false|for|func|if|ignore|import|in|module|not|null|object|or|label|let|loop|private|public|return|shared|stable|switch|system|throw|true|try|type|var|while|query)\b/,
  'function': /\b\w+(?=\s*\()/,
  'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
  'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  'punctuation': /[{}[\];(),.:]/
};

Prism.languages.mo = Prism.languages.motoko;

// Navigate up from website/ to project root, then into docs/
const docsDirectory = path.join(process.cwd(), '..', '..', '..', 'docs');
const guidesDirectory = path.join(process.cwd(), '..', '..', '..', 'guides');

export interface DocMetadata {
  title: string;
  description?: string;
  order?: number;
}

export interface Doc {
  slug: string;
  metadata: DocMetadata;
  content: string;
}

export async function getDocBySlug(slug: string, type: 'docs' | 'guides' = 'docs'): Promise<Doc | null> {
  try {
    const realSlug = slug.replace(/\.md$/, '');
    const directory = type === 'guides' ? guidesDirectory : docsDirectory;
    const fullPath = path.join(directory, `${realSlug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    const processedContent = await remark()
      .use(remarkGfm)
      .use(html, { sanitize: false })
      .process(content);
    let contentHtml = processedContent.toString();
    
    // Apply syntax highlighting to code blocks
    contentHtml = contentHtml.replace(
      /<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g,
      (match, lang, code) => {
        // Decode HTML entities
        const decodedCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        if (lang && Prism.languages[lang]) {
          const highlighted = Prism.highlight(decodedCode, Prism.languages[lang], lang);
          return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
        }
        return `<pre><code>${code}</code></pre>`;
      }
    );

    return {
      slug: realSlug,
      metadata: data as DocMetadata,
      content: contentHtml,
    };
  } catch (error) {
    console.error(`Error loading doc ${slug}:`, error);
    return null;
  }
}

export function getAllDocs(type: 'docs' | 'guides' = 'docs'): Doc[] {
  try {
    const directory = type === 'guides' ? guidesDirectory : docsDirectory;
    const fileNames = fs.readdirSync(directory);
    const allDocs = fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => {
        const realSlug = fileName.replace(/\.md$/, '');
        const fullPath = path.join(directory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        return {
          slug: realSlug,
          metadata: data as DocMetadata,
          content: content,
        };
      });

    // Sort by order if specified, otherwise alphabetically
    return allDocs.sort((a, b) => {
      if (a.metadata.order !== undefined && b.metadata.order !== undefined) {
        return a.metadata.order - b.metadata.order;
      }
      return a.slug.localeCompare(b.slug);
    });
  } catch (error) {
    console.error('Error loading docs:', error);
    return [];
  }
}

export function getDocSlugs(type: 'docs' | 'guides' = 'docs'): string[] {
  try {
    const directory = type === 'guides' ? guidesDirectory : docsDirectory;
    const fileNames = fs.readdirSync(directory);
    return fileNames
      .filter((fileName) => fileName.endsWith('.md'))
      .map((fileName) => fileName.replace(/\.md$/, ''));
  } catch (error) {
    console.error('Error getting doc slugs:', error);
    return [];
  }
}
