
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Menu, 
  Search as SearchIcon, 
  Settings as SettingsIcon, 
  Plus, 
  Folder as FolderIcon, 
  RefreshCw,
  LayoutList,
  LayoutGrid,
  X,
  ExternalLink,
  Github,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Check,
  ImageIcon,
  Pencil
} from 'lucide-react';
import { Folder, Feed, Article, Settings, FilterTime } from './types';
import { DEFAULT_FOLDERS, CORS_PROXY } from './constants';
import { fetchFeed, formatRelativeTime } from './utils/rssParser';
import { advancedSearch } from './utils/search';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('feedlybd_folders_v7');
    return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
  });

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('feedlybd_settings_v7');
    return saved ? JSON.parse(saved) : {
      viewMode: 'list',
      density: 'comfortable',
      defaultSort: 'latest',
      openInBrowser: true
    };
  });

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeViewId, setActiveViewId] = useState<string>('global-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<FilterTime>('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'all': true });
  
  // Renaming State
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFeedId, setRenamingFeedId] = useState<string | null>(null);
  const [tempRenameValue, setTempRenameValue] = useState('');

  // Folder Creation UI State
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  // Feed Addition UI State
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedFolder, setNewFeedFolder] = useState('');

  // Update default folder for new feeds when folders change
  useEffect(() => {
    if (!newFeedFolder && folders.length > 0) {
      setNewFeedFolder(folders[0].id);
    }
  }, [folders, newFeedFolder]);

  // --- PERSISTENCE LAYER ---
  useEffect(() => {
    localStorage.setItem('feedlybd_folders_v7', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('feedlybd_settings_v7', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- CORE CRUD FUNCTIONS ---

  const addFolder = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const newFolder: Folder = {
      id: `fol-${Date.now()}`,
      name: trimmedName,
      feeds: []
    };
    setFolders(prev => [...prev, newFolder]);
    setIsAddingFolder(false);
    setNewFolderNameInput('');
  };

  const renameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
    setRenamingFolderId(null);
  };

  const renameFeed = (folderId: string, feedId: string, newName: string) => {
    if (!newName.trim()) return;
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          feeds: f.feeds.map(feed => feed.id === feedId ? { ...feed, title: newName.trim() } : feed)
        };
      }
      return f;
    }));
    setRenamingFeedId(null);
  };

  const deleteFolder = (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? This will permanently remove the folder and all feeds inside it.")) return;

    // ঐ ফোল্ডারের সব ফিড আইডি বের করে নিচ্ছি যাতে নিউজ লিস্ট থেকে রিমুভ করা যায়
    const folderToDelete = folders.find(f => f.id === folderId);
    const feedIdsToRemove = folderToDelete?.feeds.map(f => f.id) || [];

    setFolders(prev => prev.filter(f => f.id !== folderId));
    setArticles(prev => prev.filter(a => !feedIdsToRemove.includes(a.feedId)));

    if (activeViewId === folderId) {
      setActiveViewId('global-all');
    }
  };

  const addFeed = async (folderId: string, feedUrl: string) => {
    if (!feedUrl.trim()) return;
    if (!folderId) {
      alert("Please create a folder first before adding feeds.");
      return;
    }
    setIsLoading(true);
    try {
      const targetUrl = `${CORS_PROXY}${encodeURIComponent(feedUrl)}`;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error("Could not reach RSS feed.");
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      if (xml.querySelector('parsererror')) throw new Error("Invalid RSS/XML content.");
      const title = xml.querySelector('title')?.textContent || 'Untitled Feed';
      
      const newFeed: Feed = {
        id: `f-${Date.now()}`,
        url: feedUrl.trim(),
        title: title.trim()
      };

      setFolders(prev => prev.map(f => {
        if (f.id === folderId) return { ...f, feeds: [...f.feeds, newFeed] };
        return f;
      }));

      const newArticles = await fetchFeed(feedUrl, newFeed.id, title);
      setArticles(prev => {
        const combined = [...newArticles, ...prev];
        return combined.sort((a, b) => b.pubDate - a.pubDate);
      });
      setIsAddModalOpen(false);
      setNewFeedUrl('');
    } catch (err: any) {
      alert(`Failed to add feed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFeed = (folderId: string, feedId: string) => {
    if (!confirm("Remove this feed?")) return;

    setFolders(prev => prev.map(folder => {
      if (folder.id === folderId) {
        return {
          ...folder,
          feeds: folder.feeds.filter(feed => feed.id !== feedId)
        };
      }
      return folder;
    }));

    setArticles(prev => prev.filter(article => article.feedId !== feedId));
  };

  const refreshFeeds = useCallback(async () => {
    if (folders.every(f => f.feeds.length === 0)) return;
    
    setIsRefreshing(true);
    const allFeeds = folders.flatMap(f => f.feeds.map(feed => ({ ...feed, folderId: f.id })));
    const fetchPromises = allFeeds.map(feed => fetchFeed(feed.url, feed.id, feed.title));
    const results = await Promise.all(fetchPromises);
    const allArticles = results.flat();
    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    setArticles(allArticles);
    setIsRefreshing(false);
  }, [folders]);

  useEffect(() => {
    refreshFeeds();
  }, []);

  const filteredArticles = useMemo(() => {
    let result = [...articles];
    if (activeViewId !== 'global-all') {
      const activeFolder = folders.find(f => f.id === activeViewId);
      const activeFeedIds = activeFolder ? activeFolder.feeds.map(f => f.id) : [];
      result = result.filter(a => activeFeedIds.includes(a.feedId));
    }
    const now = Date.now();
    if (timeFilter === 'today') result = result.filter(a => now - a.pubDate < 86400000);
    else if (timeFilter === '7days') result = result.filter(a => now - a.pubDate < 86400000 * 7);
    return advancedSearch(result, searchQuery);
  }, [articles, activeViewId, timeFilter, searchQuery, folders]);

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleFolderExpand = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-screen w-full bg-[#121212] text-gray-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] border-r border-[#333] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between border-b border-[#333]/50">
            <div className="flex items-center gap-3">
              <div className="bg-[#2bb24c] text-white p-1.5 rounded-lg text-xs font-black uppercase tracking-tighter">FBD</div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">FeedlyBD</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveViewId('global-all'); if (isMobile) setIsSidebarOpen(false); }} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${activeViewId === 'global-all' ? 'bg-[#2bb24c]/10 text-[#2bb24c]' : 'hover:bg-[#252525] text-gray-400'}`}
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="flex-1 text-left font-bold text-sm tracking-tight">All Stories</span>
                <span className="text-[10px] font-black opacity-50 bg-[#333] px-2 py-0.5 rounded-full">{articles.length}</span>
              </button>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-3 mb-4">
                <span>Folders</span>
                <button onClick={(e) => { e.stopPropagation(); setIsAddingFolder(true); }} className="p-1 hover:text-white transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <ul className="space-y-2">
                {isAddingFolder && (
                  <li className="px-3 mb-2 animate-in fade-in duration-200">
                    <form onSubmit={(e) => { e.preventDefault(); addFolder(newFolderNameInput); }} className="flex items-center gap-2 bg-[#222] border border-[#2bb24c]/50 rounded-xl px-2 py-1.5 focus-within:border-[#2bb24c]">
                      <input autoFocus type="text" placeholder="Folder Name..." value={newFolderNameInput} onChange={(e) => setNewFolderNameInput(e.target.value)} className="bg-transparent text-xs text-white outline-none flex-1 px-1" />
                      <button type="submit" className="text-[#2bb24c] hover:bg-[#333] p-1 rounded-lg"><Check size={14} /></button>
                      <button type="button" onClick={() => setIsAddingFolder(false)} className="text-gray-500 hover:text-white p-1 rounded-lg"><X size={14} /></button>
                    </form>
                  </li>
                )}
                {folders.map(folder => (
                  <li key={folder.id} className="group">
                    <div 
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer ${activeViewId === folder.id ? 'bg-[#333] text-white' : 'hover:bg-[#252525] text-gray-400'}`} 
                      onClick={() => { setActiveViewId(folder.id); if (isMobile) setIsSidebarOpen(false); }}
                    >
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleFolderExpand(folder.id); 
                        }} 
                        className="p-1 hover:text-white rounded-md hover:bg-[#444]/30"
                      >
                        {expandedFolders[folder.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {renamingFolderId === folder.id ? (
                        <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input 
                            autoFocus
                            className="bg-[#222] text-xs text-white outline-none flex-1 px-2 py-1 rounded-lg border border-[#2bb24c]"
                            value={tempRenameValue}
                            onChange={e => setTempRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') renameFolder(folder.id, tempRenameValue);
                              if (e.key === 'Escape') setRenamingFolderId(null);
                            }}
                            onBlur={() => renameFolder(folder.id, tempRenameValue)}
                          />
                        </div>
                      ) : (
                        <span className="flex-1 text-sm font-bold truncate">{folder.name}</span>
                      )}
                      
                      <div className="flex items-center gap-0.5">
                        <button 
                          title="Rename Folder"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingFolderId(folder.id);
                            setTempRenameValue(folder.name);
                          }}
                          className={`p-2 hover:text-[#2bb24c] transition-all rounded-lg hover:bg-[#2bb24c]/10 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          title="Delete Folder"
                          onClick={(e) => { 
                            e.stopPropagation();
                            e.preventDefault();
                            deleteFolder(folder.id); 
                          }} 
                          className={`p-2 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {expandedFolders[folder.id] && (
                      <ul className="ml-8 mt-1 space-y-1 border-l border-[#333] pl-2 animate-in fade-in slide-in-from-left-1 duration-200">
                        {folder.feeds.map(feed => (
                          <li key={feed.id} className="group/feed flex items-center justify-between px-3 py-1.5 text-xs text-gray-500 hover:text-gray-200 rounded-lg hover:bg-[#222] transition-colors">
                            {renamingFeedId === feed.id ? (
                              <input 
                                autoFocus
                                className="bg-[#111] text-xs text-white outline-none flex-1 px-2 py-1 rounded-lg border border-[#2bb24c]"
                                value={tempRenameValue}
                                onChange={e => setTempRenameValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') renameFeed(folder.id, feed.id, tempRenameValue);
                                  if (e.key === 'Escape') setRenamingFeedId(null);
                                }}
                                onBlur={() => renameFeed(folder.id, feed.id, tempRenameValue)}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <span className="truncate flex-1 font-medium">{feed.title}</span>
                            )}
                            
                            <div className="flex items-center gap-0.5">
                              <button 
                                title="Rename Feed"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingFeedId(feed.id);
                                  setTempRenameValue(feed.title);
                                }}
                                className={`text-gray-600 hover:text-[#2bb24c] transition-all p-1.5 hover:bg-[#2bb24c]/10 rounded ${isMobile ? 'opacity-100' : 'opacity-0 group-hover/feed:opacity-100'}`}
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                title="Delete Feed"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  deleteFeed(folder.id, feed.id); 
                                }} 
                                className={`text-gray-600 hover:text-red-500 transition-all p-1.5 hover:bg-red-500/10 rounded ${isMobile ? 'opacity-100' : 'opacity-0 group-hover/feed:opacity-100'}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                        {folder.feeds.length === 0 && !isAddingFolder && <li className="px-3 py-2 text-[10px] text-gray-700 italic font-medium">Empty Folder</li>}
                      </ul>
                    )}
                  </li>
                ))}
                {folders.length === 0 && !isAddingFolder && (
                  <li className="px-3 py-4 text-xs text-gray-600 text-center border border-dashed border-[#333] rounded-xl">
                    No folders. Click + to create one.
                  </li>
                )}
              </ul>
            </div>
          </nav>
          <div className="p-4 border-t border-[#333] space-y-3">
            <button onClick={() => setIsAddModalOpen(true)} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#2bb24c] hover:bg-[#25a043] text-white rounded-2xl transition-all shadow-xl active:scale-95 font-black text-sm">
              <Plus size={18} strokeWidth={3} />Add Content
            </button>
            <div className="flex gap-2">
              <button onClick={() => setShowSettings(true)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-[#252525] rounded-xl transition-all text-xs font-bold">
                <SettingsIcon size={16} /> Settings
              </button>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-white hover:bg-[#252525] rounded-xl transition-all"><Github size={16} /></a>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#121212] overflow-hidden">
        <header className="h-16 border-b border-[#333] flex items-center justify-between px-6 lg:px-10 bg-[#121212]/80 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-6 flex-1">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-[#252525] rounded-xl text-gray-400 transition-all"><Menu size={20} /></button>
            )}
            <div className="relative max-w-lg w-full">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="text" placeholder='Search your stories...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-2xl py-2 pl-12 pr-4 text-xs focus:outline-none focus:border-[#2bb24c] focus:ring-4 focus:ring-[#2bb24c]/10 transition-all" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={refreshFeeds} disabled={isRefreshing} className="p-2.5 hover:bg-[#252525] rounded-xl text-gray-400 transition-all border border-transparent hover:border-[#333]">
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-10 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6 border-b border-[#333]/50 pb-10">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-3">
                  {activeViewId === 'global-all' ? 'All Stories' : folders.find(f => f.id === activeViewId)?.name || 'Deleted View'}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-[#2bb24c] bg-[#2bb24c]/10 px-3 py-1 rounded-full uppercase tracking-widest border border-[#2bb24c]/20">Personal Library</span>
                  <span className="text-gray-700">/</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{filteredArticles.length} STORIES FOUND</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-2xl border border-[#333]">
                {(['all', 'today', '7days'] as FilterTime[]).map(f => (
                  <button key={f} onClick={() => setTimeFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider ${timeFilter === f ? 'bg-[#333] text-[#2bb24c] shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}>{f === 'all' ? 'All' : f === 'today' ? 'Today' : 'Week'}</button>
                ))}
              </div>
            </div>

            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 opacity-30">
                <div className="bg-[#1a1a1a] p-8 rounded-full mb-6 border border-[#333]"><LayoutList size={48} className="text-gray-600" /></div>
                <p className="text-sm font-black uppercase tracking-widest text-gray-500">Welcome to FeedlyBD</p>
                <p className="text-xs text-gray-600 mt-2 text-center max-w-xs">Your library is currently empty. Start by adding your favorite RSS feeds using the "Add Content" button.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredArticles.map(article => (
                  <div key={article.id} className={`group flex items-start gap-4 hover:bg-[#1a1a1a] transition-all border-b border-[#222]/50 py-6 px-4 rounded-3xl mb-2`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-black text-[#2bb24c] uppercase tracking-tighter">{article.source}</span>
                        <span className="w-1 h-1 bg-gray-800 rounded-full"></span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{formatRelativeTime(article.pubDate)}</span>
                      </div>
                      <h3 onClick={() => handleOpenLink(article.link)} className="text-lg font-extrabold text-gray-200 group-hover:text-white cursor-pointer leading-snug mb-2 transition-colors decoration-[#2bb24c] decoration-0 hover:decoration-2 hover:underline underline-offset-8">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed max-w-2xl font-medium">
                        {article.description}
                      </p>
                    </div>
                    
                    <div className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[#1f1f1f] border border-[#333] flex items-center justify-center transition-all shadow-inner group-hover:border-[#444]`}>
                      {article.thumbnail ? (
                        <img 
                          src={article.thumbnail} 
                          alt="" 
                          loading="lazy"
                          className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110" 
                        />
                      ) : (
                        <ImageIcon size={24} className="text-gray-800" />
                      )}
                    </div>

                    <button onClick={() => handleOpenLink(article.link)} className="p-2.5 text-gray-700 hover:text-white transition-all hover:bg-[#333] rounded-xl self-start">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Modals & Settings */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl p-2 scale-in-center">
            <div className="p-10">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-3xl font-black text-white tracking-tighter">Add Feed</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-gray-500 hover:text-white p-3 hover:bg-[#252525] rounded-2xl transition-all"><X size={28} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); addFeed(newFeedFolder, newFeedUrl); }} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-2">Feed RSS URL</label>
                  <input type="url" required autoFocus placeholder="https://example.com/rss" value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} className="w-full bg-[#222] border border-[#333] rounded-[1.5rem] px-6 py-5 text-sm focus:outline-none focus:border-[#2bb24c] focus:ring-4 focus:ring-[#2bb24c]/10 transition-all text-white font-medium" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] px-2">Destination Folder</label>
                  <div className="relative">
                    {folders.length > 0 ? (
                      <>
                        <select value={newFeedFolder} onChange={(e) => setNewFeedFolder(e.target.value)} className="w-full bg-[#222] border border-[#333] rounded-[1.5rem] px-6 py-5 text-sm focus:outline-none focus:border-[#2bb24c] transition-all text-white appearance-none font-bold pr-12">
                          {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </>
                    ) : (
                      <p className="text-xs text-red-400 bg-red-900/10 p-4 rounded-xl border border-red-900/20">You must create a folder first from the sidebar.</p>
                    )}
                  </div>
                </div>
                <button type="submit" disabled={isLoading || folders.length === 0} className="w-full bg-[#2bb24c] hover:bg-[#25a043] disabled:opacity-50 text-white font-black py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-[0.98]">
                  {isLoading ? <RefreshCw className="animate-spin" size={24} /> : <Plus size={24} strokeWidth={3} />}Integrate Feed
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-10 border-b border-[#333] flex items-center justify-between">
              <h3 className="text-3xl font-black text-white tracking-tighter">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white p-3 hover:bg-[#252525] rounded-2xl transition-all"><X size={28} /></button>
            </div>
            <div className="p-10 space-y-12">
              <section>
                <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-8">Interface</h4>
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-sm font-black text-gray-300 tracking-tight">Viewing Mode</label>
                    <div className="flex gap-2 p-1.5 bg-[#222] rounded-2xl border border-[#333]">
                      <button onClick={() => setSettings(s => ({...s, viewMode: 'list'}))} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${settings.viewMode === 'list' ? 'bg-[#333] text-[#2bb24c] shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}>List</button>
                      <button onClick={() => setSettings(s => ({...s, viewMode: 'magazine'}))} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${settings.viewMode === 'magazine' ? 'bg-[#333] text-[#2bb24c] shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}>Magazine</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-black text-gray-300 tracking-tight">Content Density</label>
                    <div className="flex gap-2 p-1.5 bg-[#222] rounded-2xl border border-[#333]">
                      <button onClick={() => setSettings(s => ({...s, density: 'comfortable'}))} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${settings.density === 'comfortable' ? 'bg-[#333] text-[#2bb24c] shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}>Comfy</button>
                      <button onClick={() => setSettings(s => ({...s, density: 'compact'}))} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${settings.density === 'compact' ? 'bg-[#333] text-[#2bb24c] shadow-xl' : 'text-gray-600 hover:text-gray-400'}`}>Compact</button>
                    </div>
                  </div>
                </div>
              </section>
              <div className="pt-6">
                <button onClick={() => { if(confirm("DANGER: Wipe all data?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-5 rounded-2xl border-2 border-red-900/30 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all">Factory Hard Reset</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
