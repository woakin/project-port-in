import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIContext {
  page: string;
  projectId: string | null;
  projectName: string | null;
  focus?: {
    kpiId?: string;
    kpiName?: string;
    taskId?: string;
    documentId?: string;
  };
}

interface AIAssistantContextType {
  isOpen: boolean;
  context: AIContext;
  messages: Message[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  updateContext: (newContext: Partial<AIContext>) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<AIContext>({
    page: '/',
    projectId: null,
    projectName: null,
  });

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  const updateContext = (newContext: Partial<AIContext>) => {
    setContext((prev) => ({ ...prev, ...newContext }));
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => {
      // If this is an assistant message and the last message is also assistant, replace it
      if (message.role === 'assistant' && prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
        return [...prev.slice(0, -1), message];
      }
      return [...prev, message];
    });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        context,
        messages,
        open,
        close,
        toggle,
        updateContext,
        addMessage,
        clearMessages,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
}
