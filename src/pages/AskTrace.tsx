import { useState } from 'react';
import { Bot, Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AskTrace() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
    { role: 'ai', content: "Hello! I am TRACE AI. Ask me to investigate an anomaly (e.g. 'Investigate SETL_123'), query operational metrics, or explain financial operations." }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { merchantId, aiApiKey } = useAuth();
  const navigate = useNavigate();

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-AI-Key': aiApiKey
        },
        body: JSON.stringify({ query: userMessage, merchantId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process request');

      if (data.action === 'REDIRECT') {
        setMessages(prev => [...prev, { role: 'ai', content: `Redirecting you to ${data.route}...` }]);
        setTimeout(() => {
          navigate(data.route);
        }, 1000);
      } else if (data.action === 'REPLY') {
        setMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      }

    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-accent-teal/20 text-accent-teal rounded-xl flex items-center justify-center">
          <Bot size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Ask TRACE</h1>
          <p className="text-text-secondary">Natural language interface for financial operations</p>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-xl border border-white/10 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-accent-blue text-white rounded-br-sm' 
                  : 'bg-brand-primary/50 border border-white/10 text-white rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-5 py-3 bg-brand-primary/50 border border-white/10 text-white rounded-bl-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-accent-teal" />
                <span className="text-sm text-text-secondary">TRACE is thinking...</span>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleAsk} className="p-4 border-t border-white/10 bg-black/20">
          <div className="relative">
            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. 'Investigate SETL_123' or 'What is our payment success rate?'"
              className="w-full bg-brand-primary border border-white/20 rounded-lg pl-12 pr-12 py-4 text-white focus:outline-none focus:border-accent-blue/50 transition-colors"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={!query.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-accent-blue text-white flex items-center justify-center hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-warning shrink-0 mt-0.5" size={16} />
        <p className="text-xs text-warning leading-relaxed">
          <strong>Note:</strong> Ask TRACE uses the Google Gemini 3.6 Flash model. If you encounter rate limits during this demo, the system will gracefully fall back to deterministic extraction and instruct you to use direct ID commands (e.g. "PAY_123").
        </p>
      </div>
    </div>
  );
}
