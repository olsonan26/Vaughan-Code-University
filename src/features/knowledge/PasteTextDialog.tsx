import React, { useState } from 'react';
import { Dialog } from '../../components/shared/Dialog';
import { Button } from '../../components/shared/Button';
import { knowledgeApi } from './api';

export const PasteTextDialog: React.FC<{ isOpen: boolean; onClose: () => void; onCreated: (sourceId: string) => void }> = ({ isOpen, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [type, setType] = useState<'text' | 'transcript' | 'md'>('text');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await knowledgeApi.pasteText({ title: title.trim(), text, type });
      setTitle(''); setText('');
      onCreated(res.sourceId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Paste text" description="Notes, transcripts or any text. It’s stored as an immutable source and processed like an upload." maxWidth="2xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">Title
            <input required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Type
            <select value={type} onChange={(e) => setType(e.target.value as any)}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white">
              <option value="text">Text / notes</option>
              <option value="transcript">Transcript</option>
              <option value="md">Markdown</option>
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-slate-700">Content
          <textarea required minLength={20} value={text} onChange={(e) => setText(e.target.value)} rows={14}
            className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={saving} disabled={!title.trim() || text.trim().length < 20}>Add to vault</Button>
        </div>
      </form>
    </Dialog>
  );
};
