import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { createChatSession, sendMessageStream } from '../services/geminiService';
import { ChatMessage } from '../types';
import { Chat, GenerateContentResponse } from "@google/genai";
import ReactMarkdown from 'react-markdown';

export const AICounselor: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm CourtMaster AI. Ask me about our court pricing, equipment rentals, or the best time to book!"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !chatSessionRef.current) return;

    const userMessageText = inputText;
    setInputText('');
    setError(null);
    setIsLoading(true);

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessageText
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      const aiMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: aiMessageId, role: 'model', text: '' }]);

      const stream = await sendMessageStream(chatSessionRef.current, userMessageText);
      let fullText = '';
      
      for await (const chunk of stream) {
        const chunkText = (chunk as GenerateContentResponse).text;
        if (chunkText) {
          fullText += chunkText;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessageId ? { ...msg, text: fullText } : msg
            )
          );
        }
      }

    } catch (err) {
      console.error("Chat error:", err);
      setError("Connection issue. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-4 flex items-center gap-3">
        <div className="p-2 bg-neon-500 rounded-lg">
          <Bot className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <h3 className="text-white font-bold font-display">CourtMaster AI</h3>
          <p className="text-slate-400 text-xs">Venue Assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-brand-600' : 'bg-slate-200'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-slate-600" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'}`}>
               <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm ml-12">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about prices..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-brand-500 outline-none"
          />
          <button onClick={handleSend} disabled={!inputText.trim() || isLoading} className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};