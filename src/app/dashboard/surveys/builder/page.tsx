"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { useAuthState } from '@/lib/useAuthState';
import { checkAuth, logout, subscribe } from '@/lib/auth';

interface Question {
  id: string; study_id: string; group_id: string; ls_question_id: number;
  question_code: string | null; question_text: string; question_type: string;
  question_type_name: string; is_mandatory: number | boolean;
  question_order: number; answer_options: string[] | string; attributes: any;
}

interface SurveyGroup {
  id: string; study_id: string; ls_group_id: number;
  title: string; description: string; group_order: number;
}

interface SurveyMeta {
  id: string; title: string; description: string; status: string;
  survey_url: string | null; language: string;
}

interface LsMapping { ls_survey_id: number | null; ls_survey_status: string | null; }

interface BuilderData { study: SurveyMeta; groups: SurveyGroup[]; questions: Question[]; ls: LsMapping; }

function parseOptions(opts: string[] | string): string[] {
  if (Array.isArray(opts)) return opts;
  if (typeof opts === 'string') { try { const p = JSON.parse(opts); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Single Choice', icon: '◉', lsCode: 'L' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☑', lsCode: 'M' },
  { value: 'short_text', label: 'Short Text', icon: '─', lsCode: 'E' },
  { value: 'long_text', label: 'Long Text', icon: '≡', lsCode: 'U' },
  { value: 'numeric', label: 'Numeric', icon: '#', lsCode: 'N' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  LIVE: 'bg-green-500/20 text-green-400 border border-green-500/30',
};

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-xl p-5 w-full max-w-md border border-[var(--border-primary)] shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-[var(--text-primary)] font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function QuestionProperties({ question, onSave, onDelete }: { question: Question; onSave: (id: string, fields: Partial<Question>) => void; onDelete: (id: string) => void }) {
  const [text, setText] = useState(question.question_text);
  const [code, setCode] = useState(question.question_code || '');
  const [type, setType] = useState(question.question_type_name);
  const [required, setRequired] = useState(question.is_mandatory === 1 || question.is_mandatory === true);
  const [options, setOptions] = useState(() => parseOptions(question.answer_options).join('\n'));
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    setText(question.question_text);
    setCode(question.question_code || '');
    setType(question.question_type_name);
    setRequired(question.is_mandatory === 1 || question.is_mandatory === true);
    setOptions(parseOptions(question.answer_options).join('\n'));
    setChanged(false);
  }, [question.id]);

  const markChanged = () => setChanged(true);
  const needsOptions = type === 'single_choice' || type === 'multiple_choice';

  const save = () => {
    onSave(question.id, {
      question_text: text,
      question_code: code || null,
      question_type_name: type,
      is_mandatory: required,
      answer_options: type === 'numeric' ? [] : options.split('\n').filter(o => o.trim()),
    });
    setChanged(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-[var(--text-muted)] mb-1 block">Code</label>
        <input value={code} onChange={e => { setCode(e.target.value); markChanged(); }} placeholder="Q1"
          className="w-full px-3 py-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)]" />
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] mb-1 block">Question Text</label>
        <textarea value={text} onChange={e => { setText(e.target.value); markChanged(); }} rows={3}
          className="w-full px-3 py-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)] resize-none" />
      </div>
      <div>
        <label className="text-xs text-[var(--text-muted)] mb-1 block">Type</label>
        <select value={type} onChange={e => { setType(e.target.value); markChanged(); }}
          className="w-full px-3 py-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)]">
          {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {needsOptions && (
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Options (one per line)</label>
          <textarea value={options} onChange={e => { setOptions(e.target.value); markChanged(); }} rows={5}
            className="w-full px-3 py-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)] resize-none font-mono" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="req" checked={required} onChange={e => { setRequired(e.target.checked); markChanged(); }} className="rounded" />
        <label htmlFor="req" className="text-sm text-[var(--text-secondary)]">Required</label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="primary" size="sm" onClick={save} disabled={!changed}>Save</Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(question.id)}>Delete</Button>
      </div>
      <div className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-primary)]">
        <p>Type: {QUESTION_TYPES.find(t => t.value === type)?.lsCode} ({type})</p>
        <p>Order: #{question.question_order}</p>
      </div>
    </div>
  );
}

export default function SurveyBuilderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-[var(--text-muted)]">Loading builder...</div>}>
      <SurveyBuilderInner />
    </Suspense>
  );
}

function SurveyBuilderInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studyId = searchParams.get('studyId');
  const { user, isAuthenticated } = useAuthState();
  const [data, setData] = useState<BuilderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selGroupId, setSelGroupId] = useState<string | null>(null);
  const [selQId, setSelQId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [addQOpen, setAddQOpen] = useState(false);
  const [newQType, setNewQType] = useState('single_choice');
  const [newQText, setNewQText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { checkAuth(); return subscribe(() => {}); }, []);
  useEffect(() => { if (isAuthenticated && studyId) loadBuilder(); }, [isAuthenticated, studyId]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const loadBuilder = async () => {
    setLoading(true);
    try {
      const d = await apiClient.get<BuilderData>(`/surveys/${studyId}/builder`);
      setData(d);
      if (d.groups.length > 0 && !selGroupId) setSelGroupId(d.groups[0].id);
    } catch { toastMsg('Failed to load', 'error'); }
    setLoading(false);
  };

  const toastMsg = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });
  const groups = data?.groups || [];
  const questions = data?.questions || [];
  const selGroup = groups.find(g => g.id === selGroupId);
  const groupQs = questions.filter(q => q.group_id === selGroupId).sort((a, b) => a.question_order - b.question_order);
  const selQuestion = questions.find(q => q.id === selQId);
  const status = data?.study?.status || 'DRAFT';

  const saveTitle = async () => {
    if (!editTitle.trim()) return;
    try {
      await apiClient.put(`/surveys/${studyId}/metadata`, { title: editTitle });
      if (data) setData({ ...data, study: { ...data.study, title: editTitle } });
      setEditingTitle(false); toastMsg('Title updated');
    } catch { toastMsg('Failed', 'error'); }
  };

  const addGroup = async () => {
    if (!newGroupTitle.trim()) return;
    try {
      const { group } = await apiClient.post<{ group: SurveyGroup }>(`/surveys/${studyId}/groups`, { title: newGroupTitle });
      if (data) setData({ ...data, groups: [...data.groups, group] });
      setSelGroupId(group.id); setNewGroupTitle(''); setAddGroupOpen(false); toastMsg('Group created');
    } catch { toastMsg('Failed', 'error'); }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Delete this group and all its questions?')) return;
    try {
      await apiClient.del(`/surveys/${studyId}/groups/${groupId}`);
      if (data) {
        const ng = data.groups.filter(g => g.id !== groupId);
        const nq = data.questions.filter(q => q.group_id !== groupId);
        setData({ ...data, groups: ng, questions: nq });
        if (selGroupId === groupId) setSelGroupId(ng[0]?.id || null);
        setSelQId(null);
      }
      toastMsg('Group deleted');
    } catch { toastMsg('Failed', 'error'); }
  };

  const addQuestion = async () => {
    if (!newQText.trim() || !selGroupId) return;
    try {
      const { question } = await apiClient.post<{ question: Question }>(`/surveys/${studyId}/questions`, {
        group_id: selGroupId, question_text: newQText, question_type_name: newQType,
        answer_options: newQType === 'numeric' ? [] : ['Option 1', 'Option 2'], is_mandatory: false,
      });
      if (data) setData({ ...data, questions: [...data.questions, question] });
      setSelQId(question.id); setNewQText(''); setAddQOpen(false); toastMsg('Question added');
    } catch { toastMsg('Failed', 'error'); }
  };

  const updateQuestion = async (questionId: string, fields: Partial<Question>) => {
    try {
      const { question } = await apiClient.put<{ question: Question }>(`/surveys/${studyId}/questions/${questionId}`, fields);
      if (data) setData({ ...data, questions: data.questions.map(q => q.id === questionId ? question : q) });
      toastMsg('Question updated');
    } catch { toastMsg('Failed', 'error'); }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      await apiClient.del(`/surveys/${studyId}/questions/${questionId}`);
      if (data) { setData({ ...data, questions: data.questions.filter(q => q.id !== questionId) }); if (selQId === questionId) setSelQId(null); }
      toastMsg('Question deleted');
    } catch { toastMsg('Failed', 'error'); }
  };

  const duplicateQuestion = async (questionId: string) => {
    try {
      const { question } = await apiClient.post<{ question: Question }>(`/surveys/${studyId}/questions/${questionId}/duplicate`, {});
      if (data) setData({ ...data, questions: [...data.questions, question] });
      toastMsg('Duplicated');
    } catch { toastMsg('Failed', 'error'); }
  };

  const moveQuestion = async (questionId: string, dir: 'up' | 'down') => {
    if (!data) return;
    const qs = groupQs.slice();
    const idx = qs.findIndex(q => q.id === questionId);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= qs.length) return;
    [qs[idx], qs[swap]] = [qs[swap], qs[idx]];
    const orderedIds = qs.map(q => q.id);
    try {
      await apiClient.put(`/surveys/${studyId}/questions-reorder`, { orderedIds });
      const nq = [...data.questions];
      orderedIds.forEach((id, i) => { const q = nq.find(qq => qq.id === id); if (q) q.question_order = i + 1; });
      setData({ ...data, questions: nq });
    } catch { toastMsg('Reorder failed', 'error'); }
  };

  const publishSurvey = async () => {
    setPublishing(true);
    try {
      const r = await apiClient.post<{ surveyUrl: string; lsSurveyId: number }>(`/surveys/${studyId}/publish`, {});
      if (data) setData({ ...data, study: { ...data.study, status: 'LIVE', survey_url: r.surveyUrl }, ls: { ls_survey_id: r.lsSurveyId, ls_survey_status: 'ACTIVE' } });
      toastMsg('Survey published!');
    } catch { toastMsg('Publish failed', 'error'); }
    setPublishing(false);
  };

  const unpublishSurvey = async () => {
    setPublishing(true);
    try {
      await apiClient.post(`/surveys/${studyId}/unpublish`, {});
      if (data) setData({ ...data, study: { ...data.study, status: 'DRAFT' }, ls: { ...data.ls, ls_survey_status: 'INACTIVE' } });
      toastMsg('Unpublished');
    } catch { toastMsg('Failed', 'error'); }
    setPublishing(false);
  };

  const openPreview = async () => {
    try {
      const r = await apiClient.get<{ previewUrl: string }>(`/surveys/${studyId}/preview-url`);
      setPreviewUrl(r.previewUrl); setShowPreview(true);
    } catch { toastMsg('Preview not available', 'error'); }
  };

  const lh = user ? { email: user.email, name: user.name || user.full_name, role: user.role, vendor_id: user.vendor_id } : undefined;

  if (!studyId) return (
    <DashboardLayout title="Survey Builder" subtitle="Select a study" user={lh} onLogout={() => { logout(); router.push('/'); }}>
      <div className="p-6 text-center text-[var(--text-muted)]">No study selected. Go to Surveys first.</div>
    </DashboardLayout>
  );

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Top Bar */}
      <div className="h-14 border-b border-[var(--border-primary)] flex items-center justify-between px-4 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/surveys')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          {editingTitle ? (
            <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={saveTitle} onKeyDown={e => e.key === 'Enter' && saveTitle()}
              className="bg-transparent border border-[var(--accent-1)] rounded px-2 py-1 text-[var(--text-primary)] text-sm font-semibold focus:outline-none" />
          ) : (
            <h1 className="text-[var(--text-primary)] text-lg font-semibold cursor-pointer hover:text-[var(--accent-1)]"
              onClick={() => { setEditingTitle(true); setEditTitle(data?.study?.title || ''); }}>
              {data?.study?.title || 'Loading...'}
            </h1>
          )}
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[status] || statusColors.DRAFT}`}>{status}</span>
        </div>
        <div className="flex items-center gap-2">
          {data?.study?.survey_url && <a href={data.study.survey_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent-1)] underline">View Live</a>}
          <Button variant="ghost" size="sm" onClick={openPreview}>Preview</Button>
          {status === 'LIVE' ? (
            <Button variant="danger" size="sm" onClick={unpublishSurvey} disabled={publishing}>{publishing ? '...' : 'Unpublish'}</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={publishSurvey} disabled={publishing}>{publishing ? '...' : 'Publish'}</Button>
          )}
        </div>
      </div>

      {/* 3-Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Structure */}
        <div className="w-72 border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[var(--border-primary)] flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Structure</span>
            <button onClick={() => setAddGroupOpen(true)} className="text-[var(--accent-1)] hover:text-[var(--accent-2)] text-lg leading-none">+</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {groups.map(group => (
              <div key={group.id}>
                <div className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer text-sm transition-all ${selGroupId === group.id ? 'bg-[var(--accent-1)]/10 text-[var(--accent-1)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                  onClick={() => { setSelGroupId(group.id); setSelQId(null); }}>
                  <span className="truncate font-medium">📁 {group.title}</span>
                  <button onClick={e => { e.stopPropagation(); deleteGroup(group.id); }} className="text-[var(--text-muted)] hover:text-red-400 text-xs ml-1">&times;</button>
                </div>
                {selGroupId === group.id && (
                  <div className="ml-3 border-l border-[var(--border-primary)] pl-2 space-y-0.5">
                    {groupQs.map(q => (
                      <div key={q.id} className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${selQId === q.id ? 'bg-[var(--accent-2)]/10 text-[var(--accent-2)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-primary)]'}`}
                        onClick={() => setSelQId(q.id)}>
                        <span className="truncate">{q.question_code || 'Q'}. {q.question_text}</span>
                        <span className="text-[10px] opacity-50 ml-1">{QUESTION_TYPES.find(t => t.value === q.question_type_name)?.icon}</span>
                      </div>
                    ))}
                    <button onClick={() => setAddQOpen(true)} className="w-full text-left px-2 py-1 text-xs text-[var(--accent-1)] hover:text-[var(--accent-2)]">+ Add Question</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-primary)]">
          <div className="max-w-2xl mx-auto py-6 px-8">
            {selGroup ? (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">{selGroup.title}</h2>
                  {selGroup.description && <p className="text-sm text-[var(--text-muted)] mt-1">{selGroup.description}</p>}
                </div>
                {groupQs.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-muted)]">
                    <p className="text-4xl mb-3">📝</p>
                    <p>No questions yet.</p>
                    <Button variant="primary" size="sm" className="mt-4" onClick={() => setAddQOpen(true)}>Add First Question</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupQs.map((q, idx) => {
                      const opts = parseOptions(q.answer_options);
                      const isReq = q.is_mandatory === 1 || q.is_mandatory === true;
                      return (
                        <div key={q.id} className={`p-4 rounded-lg border transition-all cursor-pointer ${selQId === q.id ? 'border-[var(--accent-1)] bg-[var(--accent-1)]/5' : 'border-[var(--border-primary)] hover:border-[var(--accent-1)]/50 bg-[var(--bg-secondary)]'}`}
                          onClick={() => setSelQId(q.id)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--accent-1)] bg-[var(--accent-1)]/10 px-2 py-0.5 rounded">{q.question_code || `Q${idx + 1}`}</span>
                              <span className="text-xs text-[var(--text-muted)]">{QUESTION_TYPES.find(t => t.value === q.question_type_name)?.label}</span>
                              {isReq && <span className="text-xs text-red-400">*</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={e => { e.stopPropagation(); moveQuestion(q.id, 'up'); }} disabled={idx === 0} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 text-sm px-1">↑</button>
                              <button onClick={e => { e.stopPropagation(); moveQuestion(q.id, 'down'); }} disabled={idx === groupQs.length - 1} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 text-sm px-1">↓</button>
                              <button onClick={e => { e.stopPropagation(); duplicateQuestion(q.id); }} className="text-[var(--text-muted)] hover:text-[var(--accent-1)] text-xs px-1" title="Duplicate">⧉</button>
                              <button onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }} className="text-[var(--text-muted)] hover:text-red-400 text-xs px-1" title="Delete">&times;</button>
                            </div>
                          </div>
                          <p className="text-[var(--text-primary)] text-sm font-medium mb-3">{q.question_text}</p>
                          {(q.question_type_name === 'single_choice' || q.question_type_name === 'multiple_choice') && opts.length > 0 && (
                            <div className="space-y-1.5">
                              {opts.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                  <span className={`w-4 h-4 ${q.question_type_name === 'single_choice' ? 'rounded-full' : 'rounded-md'} border border-[var(--border-primary)] flex-shrink-0`} />
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.question_type_name === 'short_text' && <div className="h-8 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]" />}
                          {q.question_type_name === 'long_text' && <div className="h-20 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]" />}
                          {q.question_type_name === 'numeric' && <div className="h-8 w-32 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20 text-[var(--text-muted)]">
                <p className="text-4xl mb-3">📋</p>
                <p>Select or create a group to start.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Properties */}
        <div className="w-80 border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[var(--border-primary)]">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Properties</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {selQuestion ? (
              <QuestionProperties question={selQuestion} onSave={updateQuestion} onDelete={deleteQuestion} />
            ) : (
              <div className="text-center py-10 text-[var(--text-muted)] text-sm">Select a question to edit</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {addGroupOpen && (
        <Modal title="Add Group" onClose={() => setAddGroupOpen(false)}>
          <input autoFocus value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGroup()} placeholder="Group title"
            className="w-full px-3 py-2 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)]" />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setAddGroupOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={addGroup} disabled={!newGroupTitle.trim()}>Add</Button>
          </div>
        </Modal>
      )}

      {addQOpen && (
        <Modal title="Add Question" onClose={() => setAddQOpen(false)}>
          <div className="space-y-3">
            <textarea autoFocus value={newQText} onChange={e => setNewQText(e.target.value)} placeholder="Question text..."
              className="w-full px-3 py-2 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)] h-20 resize-none" />
            <select value={newQType} onChange={e => setNewQType(e.target.value)}
              className="w-full px-3 py-2 rounded border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-1)]">
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" size="sm" onClick={() => setAddQOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={addQuestion} disabled={!newQText.trim()}>Add</Button>
          </div>
        </Modal>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6" onClick={() => setShowPreview(false)}>
          <div className="bg-[var(--bg-secondary)] rounded-xl w-full max-w-4xl h-[80vh] flex flex-col border border-[var(--border-primary)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)]">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Survey Preview</span>
              <button onClick={() => setShowPreview(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">&times;</button>
            </div>
            <iframe src={previewUrl} className="flex-1 w-full rounded-b-xl" title="Preview" />
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
