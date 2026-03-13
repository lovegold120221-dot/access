/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useSettings, useUI, useLogStore, useAuthStore } from '@/lib/state';
import { useLiveAPIContext } from '@/contexts/LiveAPIContext';
import { useState, useEffect } from 'react';
import { X, Settings, History, Globe, User, MessageSquare, Mic2, Volume2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db } from '@/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LANGUAGES = [
  'English', 'French', 'German', 'Dutch', 'Spanish', 'Italian', 'Arabic', 'Turkish', 'Tagalog', 'Chinese', 'Japanese', 'Korean'
];

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { 
    staffLanguage, guestLanguage, topic, staffVoice, guestVoice,
    setStaffLanguage, setGuestLanguage, setTopic, setStaffVoice, setGuestVoice
  } = useSettings();
  const { connected } = useLiveAPIContext();
  const { turns } = useLogStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user && activeTab === 'history') {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid),
        orderBy('startTime', 'desc'),
        limit(10)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
        }));
        setHistory(sessions);
      });

      return () => unsubscribe();
    }
  }, [user, activeTab]);

  return (
    <aside className={cn(
      "fixed inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-800 transform transition-transform duration-300 ease-in-out z-40 flex flex-col",
      isSidebarOpen ? "translate-x-0" : "translate-x-full"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex bg-zinc-900 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === 'settings' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Settings size={14} />
            Settings
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeTab === 'history' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <History size={14} />
            History
          </button>
        </div>
        <button onClick={toggleSidebar} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'settings' ? (
          <div className="p-6 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <Globe size={14} />
                Language Configuration
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 flex items-center gap-2">
                    <User size={12} /> Staff Language
                  </label>
                  <select 
                    value={staffLanguage} 
                    onChange={e => setStaffLanguage(e.target.value)}
                    disabled={connected}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 flex items-center gap-2">
                    <Globe size={12} /> Guest Language (Initial)
                  </label>
                  <select 
                    value={guestLanguage} 
                    onChange={e => setGuestLanguage(e.target.value)}
                    disabled={connected}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                  >
                    {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <Volume2 size={14} />
                Voice Selection
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 flex items-center gap-2">
                    <Mic2 size={12} /> Staff Translation Voice
                  </label>
                  <select 
                    value={staffVoice} 
                    onChange={e => setStaffVoice(e.target.value)}
                    disabled={connected}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                  >
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-400 flex items-center gap-2">
                    <Volume2 size={12} /> Guest Translation Voice
                  </label>
                  <select 
                    value={guestVoice} 
                    onChange={e => setGuestVoice(e.target.value)}
                    disabled={connected}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                  >
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                <MessageSquare size={14} />
                Context
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Conversation Topic</label>
                <input 
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  disabled={connected}
                  placeholder="e.g. Pharmacy Consultation"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/10 transition-all"
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-600 space-y-2">
                <History size={40} strokeWidth={1} />
                <p className="text-xs uppercase tracking-widest">No history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((session, i) => (
                  <div key={session.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                        {session.topic}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {session.startTime?.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      {session.staffLanguage} ↔ {session.guestLanguage}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-6 border-t border-zinc-800 bg-zinc-950/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full animate-pulse",
            connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-700"
          )} />
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            {connected ? "Session Active" : "Bridge Offline"}
          </span>
        </div>
      </div>
    </aside>
  );
}
