/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useEffect, useRef, useState } from 'react';
import { LiveServerContent, Modality } from '@google/genai';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { useSettings, useLogStore, ConversationTurn, useAuthStore } from '@/lib/state';
import { getTranslationPrompt } from '@/lib/prompts';
import { User, Globe, Mic2, Volume2, MessageSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function StreamingConsole() {
  const { client, setConfig, connected } = useLiveAPIContext();
  const { staffLanguage, guestLanguage, topic, staffVoice, guestVoice } = useSettings();
  const { user } = useAuthStore();
  const turns = useLogStore(state => state.turns);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize session in Firestore when connected
  useEffect(() => {
    if (connected && user && !sessionId) {
      const startSession = async () => {
        const sessionRef = doc(collection(db, 'sessions'));
        const newSessionId = sessionRef.id;
        await setDoc(sessionRef, {
          id: newSessionId,
          userId: user.uid,
          startTime: serverTimestamp(),
          staffLanguage,
          guestLanguage,
          topic,
        });
        setSessionId(newSessionId);
      };
      startSession();
    } else if (!connected) {
      setSessionId(null);
    }
  }, [connected, user, staffLanguage, guestLanguage, topic]);

  // Set the configuration for the Live API
  useEffect(() => {
    const config: any = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: staffVoice, 
          },
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: {
        parts: [
          {
            text: getTranslationPrompt(staffLanguage, guestLanguage, topic),
          },
        ],
      },
      tools: [],
    };

    setConfig(config);
  }, [setConfig, staffLanguage, guestLanguage, topic, staffVoice, guestVoice]);

  useEffect(() => {
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const saveTurnToFirestore = async (turn: Omit<ConversationTurn, 'timestamp'>) => {
      if (sessionId && user) {
        try {
          await addDoc(collection(db, 'sessions', sessionId, 'turns'), {
            sessionId,
            timestamp: serverTimestamp(),
            speaker: turn.role === 'user' ? 'guest' : turn.role === 'agent' ? 'staff' : 'system',
            originalText: turn.text,
            translatedText: turn.translation || '',
          });
        } catch (e) {
          console.error("Error saving turn:", e);
        }
      }
    };

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        addTurn({ role: 'agent', text, isFinal });
      }
    };

    const handleContent = (serverContent: LiveServerContent) => {
      const text =
        serverContent.modelTurn?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join(' ') ?? '';
      
      if (!text) return;

      const turns = useLogStore.getState().turns;
      const last = turns.at(-1);

      if (last?.role === 'agent' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
        });
      } else {
        addTurn({ role: 'agent', text, isFinal: false });
      }
    };

    const handleTurnComplete = () => {
      const last = useLogStore.getState().turns.at(-1);
      if (last && !last.isFinal) {
        updateLastTurn({ isFinal: true });
        // Save to Firestore only when finalized
        saveTurnToFirestore({ 
          role: last.role, 
          text: last.text, 
          isFinal: true 
        });
      }
    };

    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);

    return () => {
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
    };
  }, [client, sessionId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns]);

  if (!connected && turns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 text-center max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-2xl">
          <Globe className="text-zinc-500" size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold tracking-tight uppercase italic">Ready to bridge the gap?</h2>
          <p className="text-zinc-500 text-lg leading-relaxed">
            DualTranslate is configured for <span className="text-white font-medium">{staffLanguage}</span> ↔ <span className="text-white font-medium">{guestLanguage}</span>.
            Click the play button below to start your real-time translation session.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full pt-8">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-2">
            <Mic2 size={20} className="text-blue-400 mx-auto" />
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Staff</p>
            <p className="text-sm font-medium">{staffLanguage}</p>
          </div>
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-2">
            <MessageSquare size={20} className="text-zinc-400 mx-auto" />
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Topic</p>
            <p className="text-sm font-medium">{topic}</p>
          </div>
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-2">
            <Volume2 size={20} className="text-emerald-400 mx-auto" />
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Guest</p>
            <p className="text-sm font-medium">{guestLanguage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      <div className="flex-1 overflow-y-auto space-y-6 pb-20 scroll-smooth" ref={scrollRef}>
        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col space-y-2 transition-all duration-300",
              t.role === 'user' ? "items-start" : "items-end",
              !t.isFinal && "opacity-70"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest mb-1",
              t.role === 'user' ? "text-zinc-500" : "text-emerald-400"
            )}>
              {t.role === 'user' ? (
                <>
                  <User size={12} />
                  Original Utterance
                </>
              ) : (
                <>
                  Translation
                  <Globe size={12} />
                </>
              )}
              <span className="text-zinc-700 font-normal ml-2">
                {t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            
            <div className={cn(
              "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg",
              t.role === 'user' 
                ? "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none" 
                : "bg-white text-black font-medium rounded-tr-none"
            )}>
              {t.text}
              {!t.isFinal && (
                <span className="inline-flex ml-1 gap-0.5">
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
