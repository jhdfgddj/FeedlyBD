
import { Article } from '../types';

export function advancedSearch(articles: Article[], query: string): Article[] {
  if (!query.trim()) return articles;

  const terms: string[] = [];
  const excluded: string[] = [];
  const phrases: string[] = [];

  // Extract phrases
  let workingQuery = query;
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    phrases.push(match[1].toLowerCase());
    workingQuery = workingQuery.replace(match[0], '');
  }

  // Split rest by whitespace
  const words = workingQuery.trim().split(/\s+/);
  words.forEach(word => {
    if (word.startsWith('-')) {
      excluded.push(word.substring(1).toLowerCase());
    } else if (word !== 'AND' && word !== 'OR') {
      terms.push(word.toLowerCase());
    }
  });

  const isOrSearch = query.includes(' OR ');

  return articles.filter(article => {
    const text = (article.title + ' ' + article.description + ' ' + article.source).toLowerCase();
    
    // Phrases must match
    if (phrases.length > 0 && !phrases.every(p => text.includes(p))) return false;
    
    // Excluded words must NOT match
    if (excluded.length > 0 && excluded.some(e => text.includes(e))) return false;

    // Remaining terms
    if (terms.length === 0) return true;

    if (isOrSearch) {
      return terms.some(t => text.includes(t));
    } else {
      return terms.every(t => text.includes(t));
    }
  });
}
