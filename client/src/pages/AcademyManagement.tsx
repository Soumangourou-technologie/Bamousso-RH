import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import api from '../utils/api';

type Lesson = { title: string; paragraphs: string[]; resourceUrl?: string };
type Question = { prompt: string; options: string[]; answer: number };
type Content = { title: string; description: string; durationMinutes: number; lessons: Lesson[]; questions: Question[] };
type Draft = { id: string; content: Content; published: boolean };
type Summary = { id: string; title: string };
type Employee = { id: string; firstName: string; lastName: string; assigned: boolean; completed: number | null; passed: boolean };

const emptyLesson = (): Lesson => ({ title: '', paragraphs: [''] });
const emptyQuestion = (): Question => ({ prompt: '', options: ['', ''], answer: 0 });
const newContent = (): Content => ({ title: '', description: '', durationMinutes: 30, lessons: [emptyLesson()], questions: [emptyQuestion()] });
const field = 'block w-full rounded border border-slate-300 bg-white p-2 text-slate-900';
const button = 'rounded bg-teal-800 px-4 py-2 font-semibold text-white disabled:opacity-50';
const card = 'space-y-3 rounded-xl border border-slate-200 bg-white p-5';

function message(error: unknown) {
  return isAxiosError(error) && typeof error.response?.data?.message === 'string'
    ? error.response.data.message : 'L’action n’a pas abouti. Réessaie dans un instant.';
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto max-w-3xl space-y-5">
      <Link className="text-teal-800 underline" to="/academie">Retour à l’Académie</Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
    </div>
  </main>;
}

export function AcademyAdmin() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<string>();
  const [content, setContent] = useState(newContent);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => setDrafts((await api.get<Draft[]>('/academy-management/admin')).data);
  useEffect(() => { void refresh().catch(error => setError(message(error))); }, []);

  function changeLesson(index: number, change: Partial<Lesson>) {
    setContent(current => ({ ...current, lessons: current.lessons.map((lesson, i) => i === index ? { ...lesson, ...change } : lesson) }));
  }
  function changeQuestion(index: number, change: Partial<Question>) {
    setContent(current => ({ ...current, questions: current.questions.map((question, i) => i === index ? { ...question, ...change } : question) }));
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = { ...content, lessons: content.lessons.map(lesson => ({
      ...lesson, paragraphs: lesson.paragraphs.flatMap(text => text.split(/\n\s*\n/)).filter(text => text.trim()),
      resourceUrl: lesson.resourceUrl?.trim() || undefined,
    })) };
    void run(async () => {
      if (editing) await api.put(`/academy-management/admin/${editing}`, value);
      else {
        const response = await api.post<Draft>('/academy-management/admin', value);
        setEditing(response.data.id);
      }
      setNotice('Brouillon enregistré.');
    });
  }

  return <Frame title="Gestion des formations">
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {notice && <p role="status" className="text-teal-800">{notice}</p>}
    <section className={card}>
      <h2 className="text-xl font-semibold">Brouillons et formations publiées</h2>
      <p>Une formation publiée est figée pour préserver les parcours et attestations en cours.</p>
      <ul className="space-y-2">
        {drafts.map(draft => <li key={draft.id} className="flex flex-wrap items-center gap-3 border-t pt-2">
          <strong>{draft.content.title}</strong>
          {draft.published ? <Link className="underline" to={`/academie?formation=${draft.id}`}>Voir la formation publiée</Link> : <>
            <button type="button" disabled={busy} className="underline" onClick={() => { setEditing(draft.id); setContent(draft.content); }}>Modifier</button>
            <button type="button" disabled={busy} className={button} onClick={() => {
              if (!window.confirm(`Publier « ${draft.content.title} » à partir du dernier brouillon enregistré ?`)) return;
              void run(async () => {
                await api.post(`/academy-management/admin/${draft.id}/publish`);
                if (editing === draft.id) { setEditing(undefined); setContent(newContent()); }
                setNotice('Formation publiée dans le catalogue.');
              });
            }}>Publier</button>
          </>}
        </li>)}
      </ul>
      <button type="button" disabled={busy} className={button} onClick={() => { setEditing(undefined); setContent(newContent()); }}>Nouvelle formation</button>
    </section>
    <form className={card} onSubmit={save}>
      <h2 className="text-xl font-semibold">{editing ? 'Modifier le brouillon' : 'Créer une formation'}</h2>
      <label>Titre<input required maxLength={140} className={field} value={content.title} onChange={e => setContent({ ...content, title: e.target.value })} /></label>
      <label>Description<textarea required maxLength={2000} className={field} value={content.description} onChange={e => setContent({ ...content, description: e.target.value })} /></label>
      <label>Durée en minutes<input required type="number" min={1} max={6000} className={field} value={content.durationMinutes} onChange={e => setContent({ ...content, durationMinutes: Number(e.target.value) })} /></label>
      {content.lessons.map((lesson, index) => <fieldset className="space-y-2 border-t pt-3" key={index}>
        <legend className="font-semibold">Leçon {index + 1}</legend>
        <label>Titre<input required className={field} value={lesson.title} onChange={e => changeLesson(index, { title: e.target.value })} /></label>
        <label>Contenu<textarea required rows={5} className={field} value={lesson.paragraphs.join('\n\n')} onChange={e => changeLesson(index, { paragraphs: [e.target.value] })} /></label>
        <label>Lien HTTPS vers une vidéo ou un PDF (facultatif)<input type="url" className={field} value={lesson.resourceUrl ?? ''} onChange={e => changeLesson(index, { resourceUrl: e.target.value })} /></label>
      </fieldset>)}
      <button type="button" className="underline" disabled={busy || content.lessons.length >= 30} onClick={() => setContent({ ...content, lessons: [...content.lessons, emptyLesson()] })}>Ajouter une leçon</button>
      {content.questions.map((question, index) => <fieldset className="space-y-2 border-t pt-3" key={index}>
        <legend className="font-semibold">Question {index + 1}</legend>
        <label>Énoncé<input required className={field} value={question.prompt} onChange={e => changeQuestion(index, { prompt: e.target.value })} /></label>
        {question.options.map((option, optionIndex) => <label key={optionIndex}>Réponse {optionIndex + 1}
          <input required className={field} value={option} onChange={e => changeQuestion(index, { options: question.options.map((value, i) => i === optionIndex ? e.target.value : value) })} />
        </label>)}
        <button type="button" className="underline" disabled={busy || question.options.length >= 6} onClick={() => changeQuestion(index, { options: [...question.options, ''] })}>Ajouter une réponse</button>
        <label>Bonne réponse<select className={field} value={question.answer} onChange={e => changeQuestion(index, { answer: Number(e.target.value) })}>
          {question.options.map((_, i) => <option key={i} value={i}>Réponse {i + 1}</option>)}
        </select></label>
      </fieldset>)}
      <button type="button" className="block underline" disabled={busy || content.questions.length >= 30} onClick={() => setContent({ ...content, questions: [...content.questions, emptyQuestion()] })}>Ajouter une question</button>
      <button className={button} disabled={busy}>Enregistrer le brouillon</button>
    </form>
  </Frame>;
}

export function AcademyTeam() {
  const [courses, setCourses] = useState<Summary[]>([]);
  const [courseId, setCourseId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ employees: Employee[]; lessonCount: number; hasMore: boolean }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const params = { courseId, page };

  useEffect(() => {
    let active = true;
    api.get<Summary[]>('/academy/catalogue').then(response => {
      if (!active) return;
      setCourses(response.data);
      setCourseId(response.data[0]?.id ?? '');
    }).catch(error => { if (active) setError(message(error)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    api.get('/academy-management/company', { params: { courseId, page } }).then(response => {
      if (active) setData(response.data);
    }).catch(error => { if (active) setError(message(error)); });
    return () => { active = false; };
  }, [courseId, page]);

  async function assign(userId: string) {
    setBusy(true);
    setError('');
    try {
      await api.post('/academy-management/company/assign', { courseId, userId });
      setData((await api.get('/academy-management/company', { params })).data);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }

  return <Frame title="Former mon équipe">
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <section className={card}>
      <label>Formation<select disabled={busy} className={field} value={courseId} onChange={e => {
        setData(undefined);
        setPage(1);
        setCourseId(e.target.value);
      }}>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
      {data && !data.employees.length && <p>Aucun collaborateur actif sur cette page.</p>}
      <ul className="space-y-2">
        {data?.employees.map(employee => <li className="flex flex-wrap items-center justify-between gap-2 border-t pt-2" key={employee.id}>
          <strong>{employee.firstName} {employee.lastName}</strong>
          {employee.assigned
            ? <span>{employee.passed ? 'Formation validée' : `${employee.completed}/${data.lessonCount} leçon(s) terminée(s)`}</span>
            : <button type="button" className={button} disabled={busy} onClick={() => void assign(employee.id)}>Inscrire</button>}
        </li>)}
      </ul>
      {(page > 1 || data?.hasMore) && <div className="flex items-center gap-3">
        <button className={button} disabled={busy || page === 1} onClick={() => { setData(undefined); setPage(page - 1); }}>Précédent</button>
        <span>Page {page}</span>
        <button className={button} disabled={busy || !data?.hasMore} onClick={() => { setData(undefined); setPage(page + 1); }}>Suivant</button>
      </div>}
    </section>
  </Frame>;
}
