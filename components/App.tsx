
import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { FeedContent } from './FeedContent';
import { UserProfile, Feed, Folder } from '../types';
import { DEFAULT_FEEDS, DEFAULT_FOLDERS, STORAGE_KEYS } from '../constants';

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    return saved ? JSON.parse(saved) : { name: 'Feedly User', avatar: null };
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return saved ? JSON.parse(saved) : true;
  });

  const [feeds, setFeeds] = useState<Feed[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FEEDS);
    return saved ? JSON.parse(saved) : DEFAULT_FEEDS;
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
  });

  const [selectedId, setSelectedId] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEEDS, JSON.stringify(feeds));
  }, [feeds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }, [folders]);

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
  };

  const handleAddFolder = (name: string) => {
    const newFolder: Folder = { id: `folder_${Date.now()}`, name, feedIds: [] };
    setFolders(prev => [...prev, newFolder]);
  };

  const handleEditFolder = (id: string, newName: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm("Delete this folder?")) {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (selectedId === folderId) setSelectedId('all');
    }
  };

  const handleAddFeed = (title: string, url: string, folderId: string) => {
    const newFeed: Feed = { id: `feed_${Date.now()}`, url, title, unreadCount: 0 };
    setFeeds(prev => [...prev, newFeed]);
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, feedIds: [...f.feedIds, newFeed.id] } : f));
  };

  const handleEditFeed = (id: string, newTitle: string, newUrl: string) => {
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, title: newTitle, url: newUrl } : f));
  };

  const handleDeleteFeed = (id: string) => {
    if (confirm("Remove this feed source?")) {
      setFeeds(prev => prev.filter(f => f.id !== id));
      setFolders(prev => prev.map(fol => ({ ...fol, feedIds: fol.feedIds.filter(fid => fid !== id) })));
      if (selectedId === id) setSelectedId('all');
    }
  };

  const handleMoveFeedToFolder = (feedId: string, targetFolderId: string) => {
    setFolders(prevFolders => prevFolders.map(folder => {
      const cleanedFeedIds = folder.feedIds.filter(id => id !== feedId);
      if (folder.id === targetFolderId) return { ...folder, feedIds: [...cleanedFeedIds, feedId] };
      return { ...folder, feedIds: cleanedFeedIds };
    }));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-darkBg transition-colors duration-200 selection:bg-primary selection:text-white">
      <Sidebar 
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        feeds={feeds}
        folders={folders}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setRefreshKey(Date.now());
          setIsSidebarOpen(false);
        }}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        onAddFolder={handleAddFolder}
        onEditFolder={handleEditFolder}
        onDeleteFolder={handleDeleteFolder}
        onAddFeed={handleAddFeed}
        onEditFeed={handleEditFeed}
        onDeleteFeed={handleDeleteFeed}
        onMoveToFolder={handleMoveFeedToFolder}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-darkBg">
        <FeedContent 
          selectedId={selectedId}
          refreshKey={refreshKey}
          feeds={feeds}
          folders={folders}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </main>
    </div>
  );
};

export default App;
