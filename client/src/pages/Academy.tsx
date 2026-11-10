import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../utils/api';

type Lesson = { id: string; title: string };
type Course = { title: string; description: string; durationMinutes: number; lessons: Lesson[] };
type Progress = {
  enrolled: boolean;
  passedAt: string | null;
  completedLessons: string[];
  lessons: (Lesson & { paragraphs: string[] })[];
  questions: { prompt: string; options: string[] }[];
};

const button = 'rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900 disabled:opacity-50';
const card = 'space-y-4 rounded-xl border border-slate-200 bg-white p-6';

export default function Academy() {
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
        const response = await api.get<Course>('/academy');
        if (active) setCourse(response.data);
        if (userId) {
          const response = await api.get<Progress>('/academy/progress');
          if (active) setProgress(response.data);
        }
      } catch {
        if (active) setError('Le parcours n’a pas pu être chargé. Actualisez la page pour réessayer.');
      }
    }
    void load();
    return () => { active = false; };
  }, [userId]);

  async function update(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      const response = await api.get<Progress>('/academy/progress');
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
      const { data } = await api.post('/academy/quiz', { answers: progress.questions.map((_, index) => answers[index]) });
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
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        {course && (
          <section className={card}>
            <h2 className="text-2xl font-bold">{course.title}</h2>
            <p>{course.description}</p>
            <p className="text-sm text-slate-600">Formation pilote gratuite · {course.durationMinutes} min · {course.lessons.length} leçons</p>
            {!progress?.enrolled && (
              <ol className="list-decimal space-y-1 pl-5">{course.lessons.map(lesson => <li key={lesson.id}>{lesson.title}</li>)}</ol>
            )}
            {!isLoading && !user && <Link className={`${button} inline-block`} to="/login" state={{ returnToAcademy: true }}>Se connecter pour s’inscrire</Link>}
            {user && progress && !progress.enrolled && (
              <button className={button} disabled={busy} onClick={() => void update(() => api.post('/academy/enroll'))}>M’inscrire</button>
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
              {done ? <p className="font-semibold text-teal-800">Leçon terminée</p> : (
                <button className={button} disabled={busy} onClick={() => void update(() => api.put(`/academy/lessons/${lesson.id}`))}>
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
            <a className={`${button} inline-block`} href={`${API_URL}/api/academy/certificate`}>Télécharger mon attestation PDF</a>
          </section>
        )}
      </div>
    </main>
  );
}
