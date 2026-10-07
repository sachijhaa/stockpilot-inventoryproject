import { useEffect, useState, FormEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Bot, User as UserIcon, AlertTriangle, TrendingUp, Info, CheckCircle2, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChartSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';

interface Insight {
  type: string;
  message: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const insightMeta: Record<string, { icon: any; color: string }> = {
  warning: { icon: AlertTriangle, color: 'text-warning' },
  alert: { icon: AlertTriangle, color: 'text-danger' },
  positive: { icon: TrendingUp, color: 'text-success' },
  info: { icon: Info, color: 'text-accent-blue' },
};

export default function AiInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm your inventory assistant. Ask me about top sellers, low stock, forecasts, or the best-performing warehouse." },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [demoForecast, setDemoForecast] = useState<{ date: string; value: number }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get('/ai/insights')
      .then((res) => setInsights(res.data.data))
      .finally(() => setLoadingInsights(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const days = 14;
    const today = new Date();
    const demo = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().slice(0, 10), value: Math.round(30 + 15 * Math.sin(i / 2) + Math.random() * 5) };
    });
    setDemoForecast(demo);
  }, []);

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { message: userMsg });
      setMessages((m) => [...m, { role: 'assistant', content: data.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I ran into an issue answering that.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-glow">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Insights</h1>
          <p className="text-slate-500 text-sm">Business intelligence generated from live inventory data</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Daily Insight Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loadingInsights && Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
          {!loadingInsights &&
            insights.map((insight, i) => {
              const meta = insightMeta[insight.type] ?? insightMeta.info;
              const Icon = meta.icon;
              return (
                <Card key={i} delay={i * 0.08} className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.05]">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <p className="text-sm text-slate-300 pt-1.5">{insight.message}</p>
                </Card>
              );
            })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card hover={false} className="flex flex-col h-[480px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" /> AI Chat Assistant
            </CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-accent-blue/20' : 'bg-accent-violet/20'}`}>
                    {msg.role === 'user' ? <UserIcon className="h-3.5 w-3.5 text-accent-blue" /> : <Bot className="h-3.5 w-3.5 text-accent-violet" />}
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] ${
                      msg.role === 'user' ? 'bg-accent-blue/15 text-slate-100' : 'bg-white/[0.05] text-slate-300'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="h-7 w-7 rounded-lg bg-accent-violet/20 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-accent-violet" />
                  </div>
                  <div className="rounded-2xl px-4 py-2.5 bg-white/[0.05] flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-slate-500"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <Input placeholder="Ask about inventory, sales, forecasts..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
            <Button type="submit" loading={chatLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        <Card hover={false}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Demand Forecast Preview
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-slate-500 mb-3">
            This is an illustrative curve. Open a product's detail view (Inventory page) to trigger a live AI forecast
            backed by the trained XGBoost model in the AI microservice.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-success mb-2">
            <CheckCircle2 className="h-3 w-3" /> Forecast model ready
          </div>
          {demoForecast.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={demoForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#0d121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} animationDuration={1200} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
