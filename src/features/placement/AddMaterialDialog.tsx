import React, { useEffect, useState } from 'react';
import { Dialog } from '../../components/shared/Dialog';
import { PlayCircle, BookOpen, Link2, Music, FileText, Image as ImageIcon, Sparkles } from 'lucide-react';
import { PlacementPicker } from './PlacementPicker';
import { placementApi } from './api';
import { parseYouTubeId } from './utils';
import type { ItemKind, PlacementTarget } from '../../../shared/classroom/types';

type Detail = { courseId: string; moduleId?: string; lessonId?: string };
type Kind = 'video' | 'reading' | 'resource' | 'audio' | 'pdf' | 'image';
const TYPES: { kind: Kind; label: string; icon: React.ReactNode; hint: string }[] = [
  { kind: 'video', label: 'YouTube video', icon: <PlayCircle className="h-5 w-5" />, hint: 'Paste a YouTube link' },
  { kind: 'reading', label: 'Reading text', icon: <BookOpen className="h-5 w-5" />, hint: 'Write or paste lesson text' },
  { kind: 'audio', label: 'Audio', icon: <Music className="h-5 w-5" />, hint: 'Link to an MP3 or recording' },
  { kind: 'pdf', label: 'PDF', icon: <FileText className="h-5 w-5" />, hint: 'Link to a PDF handout' },
  { kind: 'image', label: 'Image', icon: <ImageIcon className="h-5 w-5" />, hint: 'Link to an image' },
  { kind: 'resource', label: 'Resource link', icon: <Link2 className="h-5 w-5" />, hint: 'Any helpful link' },
];

export const AddMaterialDialog: React.FC = () => {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: Event) => { setDetail((e as CustomEvent<Detail>).detail); setKind(null); setTitle(''); setUrl(''); setText(''); setError(null); };
    window.addEventListener('classroom:add-material', h);
    return () => window.removeEventListener('classroom:add-material', h);
  }, []);

  const yt = kind === 'video' ? parseYouTubeId(url) : null;
  const valid = !!kind && (kind === 'reading' ? text.trim().length > 0 && title.trim().length > 0 : kind === 'video' ? !!yt : /^https?:\/\//.test(url));
  const close = () => { setDetail(null); setPicking(false); };

  const payload = (): any => {
    switch (kind) {
      case 'video': return { kind: 'video', youtubeId: yt, url: `https://www.youtube.com/watch?v=${yt}` };
      case 'reading': return { kind: 'reading', markdown: text };
      case 'audio': return { kind: 'audio', url };
      case 'pdf': return { kind: 'pdf', url, fileName: title || undefined };
      case 'image': return { kind: 'image', url, alt: title || 'Lesson image' };
      default: return { kind: 'resource', url, resourceType: 'link' };
    }
  };

  const confirm = async (target: PlacementTarget) => {
    setSaving(true); setError(null);
    try {
      await placementApi.createItem(target, title || TYPES.find((t) => t.kind === kind)!.label, payload(), [], 'instructor');
      window.dispatchEvent(new CustomEvent('classroom:refresh'));
      close();
    } catch (e: any) { setError(e?.message ?? 'Could not add it'); setPicking(false); }
    finally { setSaving(false); }
  };

  if (!detail) return null;
  return (
    <>
      <Dialog isOpen={!picking} onClose={close} title="Add material" description="Pick what you're adding. Next you'll choose exactly where it goes." maxWidth="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button key={t.kind} onClick={() => setKind(t.kind)} className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition ${kind === t.kind ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <span className="text-indigo-600">{t.icon}</span><span className="font-medium text-slate-800">{t.label}</span><span className="text-xs text-slate-500">{t.hint}</span>
              </button>
            ))}
          </div>
          {kind && (
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (what students will see)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {kind === 'reading'
                ? <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Lesson text (Markdown supported: # headings, **bold**, - lists)" className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
                : <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={kind === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://...'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
              {kind === 'video' && url && (yt ? <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="Video thumbnail" className="h-32 rounded-lg" /> : <p className="text-sm text-rose-600">That doesn't look like a YouTube link.</p>)}
            </div>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => { window.dispatchEvent(new CustomEvent('kate:open', { detail })); close(); }} className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"><Sparkles className="h-4 w-4" />Let Kate make it from a source</button>
            <button disabled={!valid || saving} onClick={() => setPicking(true)} className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-700">Choose where it goes</button>
          </div>
        </div>
      </Dialog>
      <PlacementPicker isOpen={picking} onClose={() => setPicking(false)} title="Where should this go?" allowedKinds={kind ? [kind as ItemKind] : undefined}
        defaultTarget={{ courseId: detail.courseId, moduleId: detail.moduleId, lessonId: detail.lessonId, kind: kind as ItemKind, slot: kind === 'resource' ? 'resource' : 'main' }} onConfirm={confirm} />
    </>
  );
};
