/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI, useAuthStore } from '@/lib/state';
import { logout } from '@/firebase';
import { Settings, LogOut, Languages } from 'lucide-react';

export default function Header() {
  const { toggleSidebar } = useUI();
  const { user } = useAuthStore();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-black/50 backdrop-blur-md z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <Languages className="text-black" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase italic leading-none">DualTranslate</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Bi-directional Bridge</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
              alt={user.displayName || 'User'} 
              className="w-6 h-6 rounded-full"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs font-medium text-zinc-300">{user.displayName}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
            onClick={toggleSidebar}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          
          <button
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all"
            onClick={logout}
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
