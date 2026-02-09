
import React, { useState, useEffect, useCallback } from 'react';
import { Feed, Folder, RSSArticle } from '../types';
import { ArticleView } from './ArticleView';
import { summarizeArticle } from '../services/geminiService';

interface ExtendedRSSArticle extends RSSArticle {
  sourceName?: string;
  _timestamp: number;
}

interface FeedContentProps {
  selectedId: string;
  refreshKey: number;
  feeds: Feed[];
  folders: Folder[];
  onToggleSidebar: () => void;
}

/**
 * AI Summary Component
 * Logic: Checks localStorage first. Only calls Gemini on manual click.
 * Handles 429 errors with a user-friendly message.
 */
const AISummary: React.FC<{ content: string; guid: string }> = ({ content, guid }) => {
  const cacheKey = `feedlybd_sum_${guid}`;
  const [summary, setSummary] = useState<string | null>(() => localStorage.getItem(cacheKey));
  const [status, setStatus] = useState<'idle' | 'loading' | 'rate-limited' | 'error'>('idle');

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering the article viewer
    if (summary || status === 'loading') return;

    setStatus('loading');
    try {
      const text = await summarizeArticle(
        content,
        "নীচের খবরের একটি সঠিক ২-লাইনের বাংলা সারসংক্ষেপ লিখুন (যাতে মূল পয়েন্টটি ফুটে ওঠে):"
      );
      setSummary(text);
      localStorage.setItem(cacheKey, text);
      setStatus('idle');
    } catch (err: any) {
      const is429 = err?.message?.includes('429') || err?.status === 429;
      setStatus(is429 ? 'rate-limited' : 'error');
    }
  };

  if (summary) {
    return (
      <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 animate-in fade-in duration-500">
        <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 italic font-medium">
          <span className="text-primary font-black uppercase text-[10px] mr-2 tracking-widest flex items-center gap-1">
            <i className="fas fa-sparkles"></i> AI Summary:
          </span>
          {summary}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {status === 'idle' && (
        <button 
          onClick={handleSummarize}
          className="group/ai flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/30 transition-all text-[11px] font-black uppercase tracking-widest text-primary shadow-sm"
        >
          <i className="fas fa-sparkles group-hover/ai:animate-pulse"></i>
          AI Summary
        </button>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2.5 py-1">
          <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-[10px] font-black text-primary/70 uppercase tracking-widest animate-pulse">Generating...</span>
        </div>
      )}

      {status === 'rate-limited' && (
        <div className="flex items-center gap-2 py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-lg max-w-fit">
          <i className="fas fa-hourglass-half text-amber-500 text-[10px]"></i>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tight">AI is busy, please wait 60 seconds.</span>
        </div>
      )}

      {status === 'error' && (
        <button 
          onClick={handleSummarize}
          className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-2 hover:underline"
        >
          <i className="fas fa-redo"></i> Error. Retry?
        </button>
      )}
    </div>
  );
};

/**
 * Cleans the title by removing trailing source names and relative time strings.
 */
const cleanTitle = (title: string): string => {
  if (!title) return '';
  return title
    .replace(/\s*\|\s*.*$/i, '')        // Remove "| Source Name"
    .replace(/\s*-\s*.*$/i, '')        // Remove "- Source Name"
    .replace(/\s+\d+\s+(min|hour|day)s?\s+ago/i, '') // Remove injected time strings
    .replace(/^(BREAKING|EXCLUSIVE|JUST IN):\s*/i, '')
    .trim();
};

const formatExactTime = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} • ${hours}:${minutes}`;
};

const extractThumbnail = (item: any): string => {
  if (item.thumbnail && item.thumbnail.trim() !== '') return item.thumbnail;
  if (item.enclosure && (item.enclosure.link || item.enclosure.url)) return item.enclosure.link || item.enclosure.url;
  const content = item.description || item.content || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  return imgMatch ? imgMatch[1] : '';
};

export const FeedContent: React.FC<FeedContentProps> = ({ selectedId, refreshKey, feeds, folders, onToggleSidebar }) => {
  const [articles, setArticles] = useState<ExtendedRSSArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ExtendedRSSArticle | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      let targetFeeds: Feed[] = [];
      if (selectedId === 'all' || selectedId === 'today') {
        targetFeeds = feeds;
      } else if (selectedId.startsWith('folder_') || folders.some(f => f.id === selectedId)) {
        const folder = folders.find(f => f.id === selectedId);
        if (folder) targetFeeds = feeds.filter(f => folder.feedIds.includes(f.id));
      } else {
        const single = feeds.find(f => f.id === selectedId);
        if (single) targetFeeds = [single];
      }

      const fetchPromises = targetFeeds.map(feed => {
        const proxy = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&cache_bust=${Date.now()}`;
        return fetch(proxy)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'ok') {
              return data.items.map((item: any) => ({
                ...item,
                title: cleanTitle(item.title),
                _timestamp: new Date(item.pubDate).getTime(),
                thumbnail: extractThumbnail(item),
                sourceName: feed.title || data.feed.title || 'News'
              }));
            }
            return [];
          })
          .catch(() => []);
      });

      const results = await Promise.all(fetchPromises);
      let merged = results.flat() as ExtendedRSSArticle[];
      merged.sort((a, b) => b._timestamp - a._timestamp);

      if (selectedId === 'today') {
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        merged = merged.filter(a => a._timestamp >= startOfToday);
      }

      setArticles(merged);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedId, feeds, folders]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles, refreshKey]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-darkBg overflow-hidden">
      <header className="h-16 border-b border-gray-100 dark:border-darkBorder flex items-center justify-between px-6 bg-white/95 dark:bg-darkBg/95 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onToggleSidebar} className="p-2 -ml-2 text-gray-400 hover:text-primary rounded-xl transition-all">
            <i className="fas fa-bars-staggered text-xl"></i>
          </button>
          <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate">
            {selectedId === 'all' ? 'All Headlines' : selectedId === 'today' ? 'Today\'s News' : (folders.find(f => f.id === selectedId)?.name || feeds.find(f => f.id === selectedId)?.title || 'FeedlyBD')}
          </h1>
        </div>
        <button onClick={() => fetchArticles()} className={`p-2.5 text-gray-400 hover:text-primary transition-all ${loading ? 'animate-spin' : ''}`}>
          <i className="fas fa-arrows-rotate text-sm"></i>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfcfc] dark:bg-darkBg">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
          {loading && articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 text-gray-300">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Refreshing Feeds</p>
            </div>
          ) : articles.length > 0 ? (
            <div className="space-y-12">
              {articles.map((article, idx) => (
                <article 
                  key={`${article.guid}-${idx}`}
                  onClick={() => setSelectedArticle(article)}
                  className="group flex flex-row items-start justify-between gap-6 cursor-pointer pb-8 border-b border-gray-100 dark:border-darkBorder/30 last:border-0 transition-transform hover:translate-x-0.5"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-xl font-bold leading-tight text-gray-900 dark:text-white line-clamp-3 mb-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h2>
                    
                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      <span className="text-primary uppercase tracking-tight">{article.sourceName}</span>
                      <span className="opacity-30">•</span>
                      <span className="opacity-80 font-mono">{formatExactTime(article.pubDate)}</span>
                    </div>

                    <AISummary content={article.description || article.content} guid={article.guid} />
                  </div>

                  {article.thumbnail && (
                    <div className="w-[90px] h-[90px] flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 dark:bg-darkSurface border border-gray-100 dark:border-darkBorder shadow-sm mt-1">
                      <img src={article.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-40 opacity-30">
              <i className="fas fa-newspaper text-5xl mb-4" />
              <p className="text-[11px] font-black uppercase tracking-widest">No articles found</p>
            </div>
          )}
        </div>
      </div>

      {selectedArticle && <ArticleView article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
    </div>
  );
};
