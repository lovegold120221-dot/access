/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { customerSupportTools } from './tools/customer-support';
import { personalAssistantTools } from './tools/personal-assistant';
import { navigationSystemTools } from './tools/navigation-system';

export type Template = 'dual-translate' | 'customer-support' | 'personal-assistant' | 'navigation-system';

const toolsets: Record<Template, FunctionCall[]> = {
  'dual-translate': [],
  'customer-support': customerSupportTools,
  'personal-assistant': personalAssistantTools,
  'navigation-system': navigationSystemTools,
};

const systemPrompts: Record<Template, string> = {
  'dual-translate': 'You are a real-time bi-directional translator.',
  'customer-support': 'You are a helpful and friendly customer support agent. Be conversational and concise.',
  'personal-assistant': 'You are a helpful and friendly personal assistant. Be proactive and efficient.',
  'navigation-system': 'You are a helpful and friendly navigation assistant. Provide clear and accurate directions.',
};
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';
import { User } from 'firebase/auth';

/**
 * Auth
 */
export const useAuthStore = create<{
  user: User | null;
  isAuthReady: boolean;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
}>(set => ({
  user: null,
  isAuthReady: false,
  setUser: user => set({ user }),
  setAuthReady: ready => set({ isAuthReady: ready }),
}));

/**
 * Settings
 */
export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  staffLanguage: string;
  guestLanguage: string;
  topic: string;
  staffVoice: string;
  guestVoice: string;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setStaffLanguage: (lang: string) => void;
  setGuestLanguage: (lang: string) => void;
  setTopic: (topic: string) => void;
  setStaffVoice: (voice: string) => void;
  setGuestVoice: (voice: string) => void;
}>(set => ({
  systemPrompt: `You are a helpful and friendly AI assistant. Be conversational and concise.`,
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  staffLanguage: 'English',
  guestLanguage: 'French',
  topic: 'General Conversation',
  staffVoice: 'Puck',
  guestVoice: 'Charon',
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setStaffLanguage: lang => set({ staffLanguage: lang }),
  setGuestLanguage: lang => set({ guestLanguage: lang }),
  setTopic: topic => set({ topic }),
  setStaffVoice: voice => set({ staffVoice: voice }),
  setGuestVoice: voice => set({ guestVoice: voice }),
}));

/**
 * UI
 */
export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: true,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

/**
 * Tools
 */
export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: any;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}



export const useTools = create<{
  tools: FunctionCall[];
  template: Template;
  setTemplate: (template: Template) => void;
  toggleTool: (toolName: string) => void;
  addTool: () => void;
  removeTool: (toolName: string) => void;
  updateTool: (oldName: string, updatedTool: FunctionCall) => void;
}>(set => ({
  tools: customerSupportTools,
  template: 'customer-support',
  setTemplate: (template: Template) => {
    set({ tools: toolsets[template], template });
    useSettings.getState().setSystemPrompt(systemPrompts[template]);
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  addTool: () =>
    set(state => {
      let newToolName = 'new_function';
      let counter = 1;
      while (state.tools.some(tool => tool.name === newToolName)) {
        newToolName = `new_function_${counter++}`;
      }
      return {
        tools: [
          ...state.tools,
          {
            name: newToolName,
            isEnabled: true,
            description: '',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
            scheduling: FunctionResponseScheduling.INTERRUPT,
          },
        ],
      };
    }),
  removeTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.filter(tool => tool.name !== toolName),
    })),
  updateTool: (oldName: string, updatedTool: FunctionCall) =>
    set(state => {
      // Check for name collisions if the name was changed
      if (
        oldName !== updatedTool.name &&
        state.tools.some(tool => tool.name === updatedTool.name)
      ) {
        console.warn(`Tool with name "${updatedTool.name}" already exists.`);
        // Prevent the update by returning the current state
        return state;
      }
      return {
        tools: state.tools.map(tool =>
          tool.name === oldName ? updatedTool : tool,
        ),
      };
    }),
}));

/**
 * Logs
 */
export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system' | 'staff' | 'guest';
  text: string;
  translation?: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
  groundingChunks?: GroundingChunk[];
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({
      turns: [...state.turns, { ...turn, timestamp: new Date() }],
    })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) {
        return state;
      }
      const newTurns = [...state.turns];
      const lastTurn = { ...newTurns[newTurns.length - 1], ...update };
      newTurns[newTurns.length - 1] = lastTurn;
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
