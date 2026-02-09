
import { Article } from '../types';
import { CORS_PROXY } from '../constants';

export async function fetchFeed(url: string, feedId: string, sourceTitle: string): Promise<Article[]> {
  try {
    // Construct the proxy URL. Some proxies work better with or without double encoding.
    // corsproxy.io works well with the full URL appended.
    const targetUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      console.warn(`Feed fetch failed for ${url}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const text = await response.text();
    
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    // Check for parsing errors
    const parserError = xml.querySelector('parsererror');
    if (parserError) {
      console.error(`XML Parsing Error for ${url}:`, parserError.textContent);
      return [];
    }

    const items = Array.from(xml.querySelectorAll('item, entry'));
    
    return items.map((item, index) => {
      const title = item.querySelector('title')?.textContent || 'No Title';
      
      // Handle Link
      let link = '#';
      const linkTag = item.querySelector('link');
      if (linkTag) {
        link = linkTag.textContent || linkTag.getAttribute('href') || '#';
      }
      
      // Handle Date
      const pubDateRaw = item.querySelector('pubDate, published, updated, dc\\:date')?.textContent;
      const pubDate = pubDateRaw ? new Date(pubDateRaw).getTime() : Date.now() - (index * 1000);
      
      // Handle Content
      const description = item.querySelector('description, summary')?.textContent || '';
      const content = item.querySelector('content\\:encoded, content')?.textContent || '';
      const author = item.querySelector('dc\\:creator, author')?.textContent || '';
      
      // Thumbnail extraction
      let thumbnail = '';
      const mediaContent = item.querySelector('media\\:content, content, enclosure');
      if (mediaContent?.getAttribute('url')) {
        thumbnail = mediaContent.getAttribute('url') || '';
      } else if (mediaContent?.getAttribute('type')?.startsWith('image')) {
        thumbnail = mediaContent.getAttribute('url') || '';
      } else {
        // Fallback: search for img tag in description/content
        const doc = parser.parseFromString(description + content, 'text/html');
        const firstImg = doc.querySelector('img');
        if (firstImg) thumbnail = firstImg.src;
      }

      return {
        id: `${feedId}-${index}-${pubDate}`,
        feedId,
        source: sourceTitle,
        title: title.trim(),
        link: link.trim(),
        description: description.replace(/<[^>]*>?/gm, '').substring(0, 200).trim() + (description.length > 200 ? '...' : ''),
        content,
        pubDate,
        author,
        thumbnail: (thumbnail && thumbnail.startsWith('http')) ? thumbnail : undefined
      };
    });
  } catch (error) {
    console.error(`Critical error fetching feed ${url}:`, error);
    return [];
  }
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (isNaN(timestamp)) return 'unknown date';
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
