
export interface Feed {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

export interface Folder {
  id: string;
  name: string;
  feeds: Feed[];
}

export interface Article {
  id: string;
  feedId: string;
  source: string;
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: number; // timestamp
  author?: string;
  thumbnail?: string;
}

export type ViewMode = 'list' | 'magazine';
export type Density = 'comfortable' | 'compact';
export type SortOrder = 'latest';

export interface Settings {
  viewMode: ViewMode;
  density: Density;
  defaultSort: SortOrder;
  openInBrowser: boolean;
}

export type FilterTime = 'all' | 'today' | '7days' | '30days';
