/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { Mic, MicOff, Play, Pause, Download, RotateCcw, Activity } from 'lucide-react';
import { useLogStore, useSettings } from '@/lib/state';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } = useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      setMuted(false);
    }
  }, [connected]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, muted, audioRecorder]);

  const handleMicClick = () => {
    if (connected) {
      setMuted(!muted);
    } else {
      connect();
    }
  };

  const handleExportLogs = () => {
    const { staffLanguage, guestLanguage, topic } = useSettings.getState();
    const { turns } = useLogStore.getState();

    const logData = {
      configuration: {
        staffLanguage,
        guestLanguage,
        topic,
      },
      conversation: turns.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString(),
      })),
    };

    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `dualtranslate-session-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="fixed bottom-0 left-0 right-0 p-6 flex items-center justify-center pointer-events-none z-50">
      <div className="flex items-center gap-2 p-2 bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-full shadow-2xl pointer-events-auto">
        <button
          className={cn(
            "p-3 rounded-full transition-all duration-300",
            connected 
              ? muted 
                ? "bg-red-900/20 text-red-400 hover:bg-red-900/30" 
                : "bg-blue-900/20 text-blue-400 hover:bg-blue-900/30"
              : "bg-zinc-800 text-zinc-500 hover:text-white"
          )}
          onClick={handleMicClick}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <div className="h-8 w-px bg-zinc-800 mx-1" />

        <button
          ref={connectButtonRef}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all duration-500",
            connected 
              ? "bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          )}
          onClick={connected ? disconnect : connect}
        >
          {connected ? (
            <>
              <Pause size={16} fill="currentColor" />
              Stop Bridge
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              Start Bridge
            </>
          )}
        </button>

        <div className="h-8 w-px bg-zinc-800 mx-1" />

        <div className="flex items-center gap-1 px-2">
          <button
            className="p-3 text-zinc-500 hover:text-white transition-colors"
            onClick={handleExportLogs}
            title="Export Session"
          >
            <Download size={18} />
          </button>
          <button
            className="p-3 text-zinc-500 hover:text-white transition-colors"
            onClick={useLogStore.getState().clearTurns}
            title="Reset Session"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {connected && (
          <div className="flex items-center gap-2 px-4 border-l border-zinc-800">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            <div className="flex gap-0.5 h-4 items-end">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-1 bg-emerald-500 rounded-full transition-all duration-100"
                  style={{ height: `${Math.max(10, volume * 100 * (0.5 + Math.random() * 0.5))}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default memo(ControlTray);
