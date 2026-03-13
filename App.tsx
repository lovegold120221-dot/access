/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { useAuth } from './hooks/use-auth';
import { useAuthStore } from './lib/state';
import { signIn } from './firebase';
import { LogIn } from 'lucide-react';

const API_KEY = process.env.GEMINI_API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error(
    'Missing required environment variable: REACT_APP_GEMINI_API_KEY'
  );
}

function App() {
  useAuth();
  const { user, isAuthReady } = useAuthStore();

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-pulse">Loading DualTranslate...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tighter uppercase italic">DualTranslate</h1>
            <p className="text-zinc-500 text-sm uppercase tracking-widest">Bi-directional Speech Translation Bridge</p>
          </div>
          
          <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/50 backdrop-blur-xl space-y-6">
            <p className="text-zinc-400">Please sign in to access the translation bridge and manage your settings.</p>
            <button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-colors"
            >
              <LogIn size={20} />
              Sign in with Google
            </button>
          </div>
          
          <div className="text-xs text-zinc-600 uppercase tracking-widest pt-8">
            Powered by Gemini Live API
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App h-screen flex flex-col bg-black text-white overflow-hidden">
      <LiveAPIProvider apiKey={API_KEY}>
        <ErrorScreen />
        <Header />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar />
          <main className="flex-1 flex flex-col relative overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <StreamingConsole />
            </div>
            <ControlTray />
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
