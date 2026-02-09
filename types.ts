
export interface UserProfile {
  name: string;
  avatar: string | null;
}

export interface RSSArticle {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string;
}

export interface Feed {
  id: string;
  url: string;
  title: string;
  folderId?: string;
  unreadCount: number;
}

export interface Folder {
  id: string;
  name: string;
  feedIds: string[];
}

export interface AppState {
  profile: UserProfile;
  feeds: Feed[];
  folders: Folder[];
  darkMode: boolean;
  selectedFeedId: string | 'all' | 'today';
}
