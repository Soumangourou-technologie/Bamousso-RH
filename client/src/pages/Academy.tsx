import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../utils/api';

type Lesson = { id: string; title: string };
type Course = { title: string; description: string; durationMinutes: number; lessons: Lesson[] };
type Progress = {
  enrolled: boolean;
  passedAt: string | null;
  completedLessons: string[];
  lessons: (Lesson & { paragraphs: string[]; resourceUrl?: string })[];
  questions: { prompt: string; options: string[] }[];
};

export const academyButton = 'rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900 disabled:opacity-50';
export const academyCard = 'space-y-4 rounded-xl border border-slate-200 bg-white p-6';

type Summary = { id: string; title: string; description: string; durationMinutes: number; lessonCount: number };

export default function Academy() {
  const [params] = useSearchParams();
  return <AcademyCourse key={params.get('formation') ?? 'pilot'} courseId={params.get('formation')} />;
}

function AcademyCourse({ courseId }: { courseId: string | null }) {
  const button = academyButton;
  const card = academyCard;
  const [catalogue, setCatalogue] = useState<Summary[]>([]);
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
  const { user, isLoading } = useAuth();
  const userId = user?.id;
  const [course, setCourse] = useState<Course>();
  const [progress, setProgress] = useState<Progress>();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setProgress(undefined);
    setAnswers({});
    setResult('');
    setError('');
    async function load() {
      try {
        const [catalogueResponse, courseResponse, progressResponse] = await Promise.all([
          api.get<Summary[]>('/academy/catalogue'),
          api.get<Course>(`/academy${query}`),
          userId ? api.get<Progress>(`/academy/progress${query}`) : undefined,
        ]);
        if (active) {
          setCatalogue(catalogueResponse.data);
          setCourse(courseResponse.data);
          setProgress(progressResponse?.data);
        }
      } catch {
        if (active) setError('Le parcours n’a pas pu être chargé. Actualisez la page pour réessayer.');
      }
    }
    void load();
    return () => { active = false; };
  }, [userId, query]);

  async function update(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      const response = await api.get<Progress>(`/academy/progress${query}`);
      setProgress(response.data);
    } catch (error) {
      setError(isAxiosError(error) && typeof error.response?.data?.message === 'string'
        ? error.response.data.message : 'L’action n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  }

  function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progress) return;
    void update(async () => {
      const { data } = await api.post(`/academy/quiz${query}`, { answers: progress.questions.map((_, index) => answers[index]) });
      setResult(data.passed
        ? `Quiz réussi (${data.score}/${data.total}). Ton attestation est disponible.`
        : `Résultat ${data.score}/${data.total}. Relis les leçons et réessaie.`);
    });
  }

  const completed = progress?.completedLessons.length ?? 0;
  const quizAvailable = progress?.enrolled && completed === progress.lessons.length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to={user ? '/dashboard' : '/'} className="font-semibold text-teal-800 hover:underline">
          {user ? 'Retour au tableau de bord' : 'Retour à l’accueil'}
        </Link>
        <header className="space-y-2 rounded-xl bg-teal-950 p-6 text-white">
          <h1 className="text-3xl font-bold">Bamousso Académie</h1>
          <p>Des formations pratiques pour développer tes compétences professionnelles.</p>
        </header>
        <section className={card}>
          <h2 className="text-xl font-bold">Catalogue</h2>
          <ul className="space-y-2">
            {catalogue.map(item => <li key={item.id}>
              <Link className="font-semibold text-teal-800 underline" to={`?formation=${encodeURIComponent(item.id)}`}>{item.title}</Link>
              <span className="ml-2 text-sm">{item.durationMinutes} min · {item.lessonCount} leçon(s)</span>
            </li>)}
          </ul>
          {user?.role === 'SUPER_ADMIN' && <Link className="inline-block text-teal-800 underline" to="/academie/gestion">Gérer les formations</Link>}
          {user?.role === 'COMPANY_ADMIN' && <Link className="inline-block text-teal-800 underline" to="/academie/equipe">Former mon équipe</Link>}
        </section>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        {course && (
          <section className={card}>
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <p>{course.description}</p>
            <p className="text-sm text-slate-600">Formation gratuite · {course.durationMinutes} min · {course.lessons.length} leçons</p>
            {!progress?.enrolled && (
              <ol className="list-decimal space-y-1 pl-5">{course.lessons.map(lesson => <li key={lesson.id}>{lesson.title}</li>)}</ol>
            )}
            {!isLoading && !user && <Link className={`${button} inline-block`} to="/login" state={{ returnToAcademy: true, courseId }}>Se connecter pour s’inscrire</Link>}
            {user && progress && !progress.enrolled && (
              <button className={button} disabled={busy} onClick={() => void update(() => api.post(`/academy/enroll${query}`))}>M’inscrire</button>
            )}
            {progress?.enrolled && (
              <p role="status" className="font-semibold text-teal-800">{completed} leçon(s) terminée(s) sur {course.lessons.length}</p>
            )}
          </section>
        )}
        {progress?.lessons.map(lesson => {
          const done = progress.completedLessons.includes(lesson.id);
          return (
            <article key={lesson.id} className={card}>
              <h2 className="text-xl font-bold">{lesson.title}</h2>
              {lesson.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              {lesson.resourceUrl && <a className="inline-block text-teal-800 underline" href={lesson.resourceUrl} target="_blank" rel="noreferrer">Ouvrir le support de la leçon</a>}
              {done ? <p className="font-semibold text-teal-800">Leçon terminée</p> : (
                <button className={button} disabled={busy} onClick={() => void update(() => api.put(`/academy/lessons/${lesson.id}${query}`))}>
                  Marquer comme terminée
                </button>
              )}
            </article>
          );
        })}
        {quizAvailable && !progress.passedAt && (
          <form className={card} onSubmit={submitQuiz}>
            <h2 className="text-xl font-bold">Quiz final</h2>
            <p>Réponds correctement aux {progress.questions.length} questions pour obtenir ton attestation.</p>
            {progress.questions.map((question, index) => (
              <fieldset key={question.prompt} className="space-y-2">
                <legend className="font-semibold">{index + 1}. {question.prompt}</legend>
                {question.options.map((option, value) => (
                  <label className="flex items-baseline gap-2" key={option}>
                    <input type="radio" name={`question-${index}`} required checked={answers[index] === value}
                      onChange={() => setAnswers(current => ({ ...current, [index]: value }))} />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <button className={button} disabled={busy}>Valider le quiz</button>
          </form>
        )}
        {result && <p role="status" className={card}>{result}</p>}
        {progress?.passedAt && (
          <section className={card}>
            <h2 className="text-xl font-bold">Formation terminée</h2>
            <a className={`${button} inline-block`} href={`${API_URL}/api/academy/certificate${query}`}>Télécharger mon attestation PDF</a>
          </section>
        )}
      </div>
    </main>
  );
}
