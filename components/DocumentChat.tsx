import React, { useState, useEffect, useRef } from 'react';
import { Chat } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Send, User, Bot, Loader2, MessageSquare, ExternalLink, Globe, ShieldCheck } from 'lucide-react';
import { ChatMessage } from '../types';

interface DocumentChatProps {
  chatSession: Chat;
  suggestedQuestions: string[];
}

const DocumentChat: React.FC<DocumentChatProps> = ({ chatSession, suggestedQuestions }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I can answer specific questions about this document. I can also search the web to verify laws or scam alerts. What would you like to know?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: text });
      const responseText = result.text || "I'm sorry, I couldn't generate a response.";
      
      // Extract grounding sources with deduplication
      const sources: { title: string; uri: string }[] = [];
      const seenUris = new Set<string>();
      
      if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        result.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri && !seenUris.has(chunk.web.uri)) {
            seenUris.add(chunk.web.uri);
            
            let title = chunk.web.title;
            if (!title) {
              try {
                title = new URL(chunk.web.uri).hostname;
              } catch (e) {
                title = "Source";
              }
            }

            sources.push({
              title: title,
              uri: chunk.web.uri
            });
          }
        });
      }

      const botMsg: ChatMessage = { 
        role: 'model', 
        text: responseText, 
        timestamp: new Date(),
        sources: sources.length > 0 ? sources : undefined
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error answering that. Please try again.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
      {/* Header */}
      <div className="bg-navy-900 p-4 flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg">
          <MessageSquare className="w-5 h-5 text-gold-500" />
        </div>
        <div>
          <h3 className="font-bold text-white">LegalSense Assistant</h3>
          <p className="text-xs text-slate-300">Powered by Gemini Pro + Google Search</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-navy-800' : 'bg-gold-500'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                
                <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-white border border-slate-200 text-slate-800 rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'text-slate-700' : 'text-slate-800'}`}>
                    {msg.role === 'user' ? (
                       <p>{msg.text}</p>
                    ) : (
                      <ReactMarkdown 
                        components={{
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({node, ...props}) => <span className="font-bold text-navy-900" {...props} />,
                          a: ({node, href, children, ...props}) => (
                            <a 
                              href={href} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 underline hover:text-blue-800 break-all"
                              {...props}
                            >
                              {children}
                            </a>
                          )
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sources Display */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="ml-12 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-full inline-block shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verified Sources</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {msg.sources.map((source, sIdx) => (
                      <a 
                        key={sIdx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs bg-white border border-slate-200 text-blue-600 px-3 py-2 rounded-md hover:border-blue-300 hover:shadow-sm transition-all group"
                        title={source.title}
                      >
                        <Globe className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                        <span className="truncate max-w-[200px] font-medium underline decoration-blue-200 underline-offset-2">{source.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-blue-400 ml-auto flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="flex gap-3 max-w-[85%]">
               <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
               </div>
               <div className="p-4 bg-white rounded-2xl rounded-tl-none border border-slate-200 flex items-center shadow-sm">
                 <Loader2 className="w-4 h-4 text-gold-500 animate-spin mr-3" />
                 <span className="text-sm text-slate-500 font-medium">Analyzing & Searching...</span>
               </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions & Input */}
      <div className="p-4 bg-white border-t border-slate-100 z-10">
        {messages.length < 4 && suggestedQuestions.length > 0 && (
          <div className="mb-3 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar flex gap-2">
            {suggestedQuestions.map((q, i) => (
               <button 
                key={i}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 hover:text-navy-900 text-slate-600 text-xs font-medium rounded-lg transition-colors border border-slate-200"
               >
                 {q}
               </button>
            ))}
          </div>
        )}
        
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask a question about the document or check a law..."
            className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all text-sm"
            disabled={loading}
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-navy-900 text-white rounded-lg hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentChat;