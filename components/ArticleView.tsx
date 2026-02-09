
import React, { useState, useEffect } from 'react';
import { RSSArticle } from '../types';
import { summarizeArticle } from '../services/geminiService';

interface ArticleViewProps {
  article: RSSArticle;
  onClose: () => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ article, onClose }) => {
  const [summary, setSummary] = useState<string | null>(() => localStorage.getItem(`summary_${article.guid}`));
  const [status, setStatus] = useState<'idle' | 'loading' | 'rate-limited' | 'error'>('idle');

  const handleSummarize = async () => {
    if (summary || status === 'loading') return;
    
    setStatus('loading');
    try {
      const text = await summarizeArticle(
        article.description + (article.content || ''),
        "নীচের খবরের একটি সঠিক ২-লাইনের বাংলা সারসংক্ষেপ লিখুন (যাতে মূল পয়েন্টটি ফুটে ওঠে):"
      );
      setSummary(text);
      localStorage.setItem(`summary_${article.guid}`, text);
      setStatus('idle');
    } catch (err: any) {
      const is429 = err?.message?.includes('429') || err?.status === 429;
      setStatus(is429 ? 'rate-limited' : 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full h-full md:w-[700px] bg-white dark:bg-darkBg shadow-2xl overflow-y-auto flex flex-col slide-in-from-right animate-in duration-300">
        <div className="sticky top-0 bg-white/90 dark:bg-darkBg/90 backdrop-blur px-6 py-4 border-b border-gray-200 dark:border-darkBorder flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-darkSurface rounded-full">
              <i className="fas fa-arrow-left"></i>
            </button>
            <span className="text-sm font-medium text-primary uppercase tracking-widest">Reading Article</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-primary"><i className="far fa-bookmark"></i></button>
            <button className="p-2 text-gray-500 hover:text-primary"><i className="fas fa-external-link-alt"></i></button>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-12">
          {article.thumbnail && (
            <img src={article.thumbnail} alt="" className="w-full h-64 object-cover rounded-xl mb-8 shadow-lg" />
          )}
          
          <div className="space-y-4 mb-8">
             <div className="flex items-center gap-3 text-sm text-gray-500 font-mono">
              <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{article.author || 'News Source'}</span>
              <span>•</span>
              <span>{new Date(article.pubDate).toLocaleDateString()}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight text-gray-900 dark:text-white">
              {article.title}
            </h1>
          </div>

          {/* Gemini AI Summary Tool */}
          <div className="mb-10 p-6 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary font-bold">
                <i className="fas fa-sparkles"></i>
                <span className="uppercase tracking-widest text-[11px] font-black">Gemini AI Summary</span>
              </div>
              {!summary && status !== 'loading' && (
                <button 
                  onClick={handleSummarize}
                  className="text-[10px] font-black uppercase tracking-widest bg-primary text-white px-4 py-1.5 rounded-full hover:bg-opacity-90 transition-all shadow-md active:scale-95"
                >
                  Generate Summary
                </button>
              )}
            </div>

            {status === 'loading' && (
              <div className="flex items-center gap-3 text-sm text-primary animate-pulse py-2">
                <i className="fas fa-circle-notch fa-spin"></i>
                <span className="font-bold">Analyzing content...</span>
              </div>
            )}

            {status === 'rate-limited' && (
              <div className="flex items-center gap-3 text-amber-500 py-2">
                <i className="fas fa-bed"></i>
                <span className="text-sm font-bold">AI is resting, try again in a minute.</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center justify-between gap-3 text-red-500 py-2">
                <span className="text-sm">Summary engine failed.</span>
                <button onClick={handleSummarize} className="text-xs font-bold underline">Retry</button>
              </div>
            )}

            {summary && (
              <div className="text-base leading-relaxed text-gray-700 dark:text-gray-300 italic font-medium">
                {summary}
              </div>
            )}

            {!summary && status === 'idle' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get the key takeaways instantly without reading the whole piece.
              </p>
            )}
          </div>

          <div 
            className="prose dark:prose-invert max-w-none text-lg leading-relaxed text-gray-800 dark:text-gray-300 space-y-6"
            dangerouslySetInnerHTML={{ __html: article.content || article.description }}
          />

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-darkBorder flex flex-col items-center">
            <p className="text-gray-500 text-sm mb-4">Finished reading?</p>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-gray-100 dark:bg-darkSurface text-gray-900 dark:text-white rounded-full font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-md text-xs"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
