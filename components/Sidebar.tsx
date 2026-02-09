
import React, { useRef, useState } from 'react';
import { UserProfile, Feed, Folder } from '../types';

interface SidebarProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
  feeds: Feed[];
  folders: Folder[];
  selectedId: string;
  onSelect: (id: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onAddFolder: (name: string) => void;
  onEditFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onAddFeed: (title: string, url: string, folderId: string) => void;
  onEditFeed: (id: string, title: string, url: string) => void;
  onDeleteFeed: (id: string, folderId?: string) => void;
  onMoveToFolder: (feedId: string, folderId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  profile,
  onUpdateProfile,
  feeds,
  folders,
  selectedId,
  onSelect,
  darkMode,
  toggleDarkMode,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  onAddFeed,
  onEditFeed,
  onDeleteFeed,
  onMoveToFolder,
  isOpen,
  onClose
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['national', 'online', 'english']));
  
  // State for Add Folder and Add Feed popups
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [activeTargetFolderId, setActiveTargetFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFeed, setNewFeed] = useState({ title: '', url: '' });

  const toggleFolderExpand = (id: string) => {
    const next = new Set(expandedFolders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedFolders(next);
  };

  const handleFolderHeaderClick = (id: string) => {
    onSelect(id);
    toggleFolderExpand(id);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onAddFolder(newFolderName.trim());
    setNewFolderName('');
    setShowAddFolderModal(false);
  };

  const handleCreateFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeed.url || !activeTargetFolderId) return;
    onAddFeed(newFeed.title || newFeed.url.split('/')[2], newFeed.url, activeTargetFolderId);
    setNewFeed({ title: '', url: '' });
    setActiveTargetFolderId(null);
  };

  const navItemClass = (id: string) => `
    group flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer text-sm
    ${selectedId === id 
      ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' 
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-darkSurface'}
  `;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`
        fixed inset-y-0 left-0 z-50 h-full w-[280px] bg-white dark:bg-darkSurface border-r border-gray-200 dark:border-darkBorder
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        {/* Profile */}
        <div className="p-5 border-b border-gray-100 dark:border-darkBorder">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg overflow-hidden">
              {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <i className="fas fa-user"></i>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white truncate">{profile.name}</p>
              <p className="text-[10px] text-primary font-black uppercase tracking-widest">Premium Member</p>
            </div>
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-darkBg transition-colors">
              <i className={`fas ${darkMode ? 'fa-sun text-yellow-500' : 'fa-moon text-gray-400'} text-xs`}></i>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div className="space-y-1.5">
            <div onClick={() => onSelect('today')} className={navItemClass('today')}>
              <i className="fas fa-bolt w-4 text-center"></i><span>Today</span>
            </div>
            <div onClick={() => onSelect('all')} className={navItemClass('all')}>
              <i className="fas fa-layer-group w-4 text-center"></i><span>All Feeds</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">
              <span>Collections</span>
              <button 
                onClick={() => setShowAddFolderModal(true)} 
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <i className="fas fa-plus"></i> NEW FOLDER
              </button>
            </div>

            {folders.map(folder => (
              <div key={folder.id} className="space-y-1">
                <div 
                  onClick={() => handleFolderHeaderClick(folder.id)}
                  className={`
                    flex items-center justify-between group/row p-2.5 rounded-xl cursor-pointer transition-all duration-200
                    ${selectedId === folder.id ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-gray-50 dark:hover:bg-darkBg border border-transparent'}
                  `}
                >
                  <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest">
                    <i className={`fas fa-caret-${expandedFolders.has(folder.id) ? 'down' : 'right'} text-[10px] transition-transform duration-200 w-2`}></i>
                    <span className="truncate max-w-[140px]">{folder.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onDeleteFolder(folder.id); }} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  </div>
                </div>

                {expandedFolders.has(folder.id) && (
                  <div className="ml-5 border-l-2 border-gray-100 dark:border-darkBorder space-y-0.5 mt-1 pb-2 animate-in slide-in-from-top-1 duration-200">
                    {feeds.filter(f => folder.feedIds.includes(f.id)).map(feed => (
                      <div 
                        key={feed.id} 
                        onClick={() => onSelect(feed.id)}
                        className={`
                          group/feed flex items-center gap-3 px-3 py-2 text-xs rounded-r-lg transition-all cursor-pointer
                          ${selectedId === feed.id ? 'text-primary font-bold bg-primary/5' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-darkBg'}
                        `}
                      >
                        <img src={`https://www.google.com/s2/favicons?domain=${feed.url}&sz=32`} className="w-3.5 h-3.5 grayscale group-hover/feed:grayscale-0 transition-all rounded-sm" alt="" />
                        <span className="truncate flex-1">{feed.title}</span>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteFeed(feed.id, folder.id); }} className="opacity-0 group-hover/feed:opacity-100 text-[10px] text-gray-400 hover:text-red-500 p-1">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                    
                    {/* The Prominent Add Feed Card/Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveTargetFolderId(folder.id); }}
                      className="w-[calc(100%-12px)] ml-1 flex items-center justify-center gap-2 py-3 mt-2 rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary transition-all group/add-btn"
                    >
                      <i className="fas fa-plus-circle text-lg group-hover/add-btn:scale-110 transition-transform"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest">Add New Feed</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* MODAL: Add Folder */}
      {showAddFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateFolder} className="w-full max-w-xs bg-white dark:bg-darkSurface rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-darkBorder animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 dark:text-white uppercase tracking-tight text-center">Create Folder</h3>
            <input required autoFocus type="text" placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full px-5 py-3 bg-gray-50 dark:bg-darkBg border-none rounded-2xl text-sm mb-6 focus:ring-2 focus:ring-primary transition-all text-center font-bold" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAddFolderModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-darkBg rounded-2xl transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3 text-sm font-black bg-primary text-white rounded-2xl uppercase tracking-widest shadow-lg active:scale-95 transition-all">Create</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Feed (Direct Folder Assignment) */}
      {activeTargetFolderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateFeed} className="w-full max-w-sm bg-white dark:bg-darkSurface rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-darkBorder animate-in zoom-in-95">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black mb-1 dark:text-white uppercase tracking-tighter">New Source</h3>
              <p className="text-[11px] text-primary font-black uppercase tracking-widest opacity-80">
                Adding to: {folders.find(f => f.id === activeTargetFolderId)?.name}
              </p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Feed Link (RSS/XML)</label>
                <input required autoFocus type="url" placeholder="https://news.com/rss" value={newFeed.url} onChange={e => setNewFeed({...newFeed, url: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-darkBg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-1">Name (Optional)</label>
                <input type="text" placeholder="e.g. Daily Tech" value={newFeed.title} onChange={e => setNewFeed({...newFeed, title: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-darkBg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary transition-all font-medium" />
              </div>
            </div>

            <div className="flex gap-3 mt-10">
              <button type="button" onClick={() => setActiveTargetFolderId(null)} className="flex-1 py-3.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-darkBg rounded-2xl transition-colors">Cancel</button>
              <button type="submit" className="flex-1 py-3.5 text-sm font-black bg-primary text-white rounded-2xl uppercase tracking-widest shadow-lg hover:shadow-primary/20 active:scale-95 transition-all">Sync Feed</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
