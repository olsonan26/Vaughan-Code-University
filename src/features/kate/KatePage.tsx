import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { getThreads, type KateThread } from './api';
import { KateChat } from './KateChat';

export const KatePage: React.FC = () => {
  const [threads, setThreads] = useState<KateThread[]>([]);
  const [active, setActive] = useState<string | null>(localStorage.getItem('vcu.kate.threadId'));
  const load = () => getThreads().then((r) => setThreads(r.threads ?? [])).catch(() => {});
  useEffect(() => { void load(); }, []);
  return (
    <div className="grid h-[calc(100vh-140px)] min-h-[500px] gap-4 md:grid-cols-[260px_1fr]">
      <aside className="flex flex-col rounded-2xl border border-slate-200 bg-white">
        <button onClick={() => { localStorage.removeItem('vcu.kate.threadId'); setActive(null); }} className="m-3 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />New conversation</button>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {threads.map((t: any) => (
            <li key={t.id}><button onClick={() => { localStorage.setItem('vcu.kate.threadId', t.id); setActive(t.id); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${active === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}><MessageSquare className="h-4 w-4 shrink-0" /><span className="truncate">{t.title || 'Conversation'}</span></button></li>
          ))}
        </ul>
      </aside>
      <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"><KateChat key={active ?? 'new'} threadId={active} onThread={(id) => { setActive(id); void load(); }} /></section>
    </div>
  );
};
export default KatePage;
