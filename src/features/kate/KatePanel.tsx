import React, { useEffect, useState } from 'react';
import { Sparkles, X, Maximize2 } from 'lucide-react';
import { KateChat, type KateContext } from './KateChat';
import { useStudioPermissions } from '../instructor/permissions';

/** Floating "Ask Kate" launcher + slide-over. Opens on window 'kate:open' events. Instructors only. */
export const KatePanel: React.FC = () => {
  const { can } = useStudioPermissions();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<KateContext>({});
  const [prompt, setPrompt] = useState<string | undefined>();
  const [checklistFor, setChecklistFor] = useState<string[] | undefined>();
  useEffect(() => {
    const h = (e: Event) => {
      const d = ((e as CustomEvent).detail ?? {}) as KateContext & { prompt?: string; checklist?: boolean };
      setCtx({ courseId: d.courseId, moduleId: d.moduleId, lessonId: d.lessonId, sourceIds: d.sourceIds });
      setPrompt(d.prompt);
      setChecklistFor(d.checklist && d.sourceIds?.length ? d.sourceIds : undefined);
      setOpen(true);
    };
    window.addEventListener('kate:open', h);
    return () => window.removeEventListener('kate:open', h);
  }, []);
  if (!can('kate.use' as any)) return null;
  return (
    <>
      {!open && <button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"><Sparkles className="h-4 w-4" />Ask Kate</button>}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 sm:bg-transparent sm:inset-auto sm:bottom-0 sm:right-0 sm:top-0">
          <div className="flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[460px]">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Sparkles className="h-5 w-5 text-indigo-600" /><div className="flex-1"><div className="font-semibold text-slate-900">Kate</div><div className="text-xs text-slate-500">Builds only from your sources. You approve every change.</div></div>
              <a href="/instructor/kate" title="Open full page" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></a>
              <button onClick={() => setOpen(false)} aria-label="Close Kate" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1"><KateChat initialContext={ctx} initialPrompt={prompt} checklistFor={checklistFor} /></div>
          </div>
        </div>
      )}
    </>
  );
};
