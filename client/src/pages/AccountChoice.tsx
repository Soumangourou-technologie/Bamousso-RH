import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const box = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-6';
const button = 'inline-block rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900 disabled:opacity-50';
const field = 'mt-1 block w-full rounded-lg border border-slate-400 bg-white p-2 text-slate-900';

export default function AccountChoice() {
  const { state } = useLocation();
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/" className="text-teal-800 underline">Accueil Bamousso</Link>
      <h1 className="text-3xl font-bold text-slate-900">Quel compte souhaitez-vous créer ?</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className={box}>
          <h2 className="text-xl font-bold text-slate-900">Compte entreprise</h2>
          <p>Gérez vos équipes, référencez votre activité, trouvez des prestataires et recrutez.</p>
          <Link className={button} to="/register/entreprise" state={state}>Créer un compte entreprise</Link>
        </section>
        <section className={box}>
          <h2 className="text-xl font-bold text-slate-900">Compte personnel</h2>
          <p>Consultez les offres d’emploi, déposez votre CV et suivez les formations de l’Académie.</p>
          <Link className={button} to="/register/personnel" state={state}>Créer un compte personnel</Link>
        </section>
      </div>
      <Link to="/login" className="text-teal-800 underline">J’ai déjà un compte</Link>
    </div>
  </main>;
}

export function PersonalRegistration() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post('/auth/register', data);
      navigate('/login', { replace: true, state: { ...state, personalCreated: true } });
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message ?? 'Inscription indisponible.' : 'Inscription indisponible.');
    } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
    <form onSubmit={submit} className={`mx-auto max-w-lg ${box}`}>
      <Link to="/register" className="text-teal-800 underline">Choisir un autre type de compte</Link>
      <h1 className="text-3xl font-bold text-slate-900">Créer mon compte personnel</h1>
      <label className="block">Prénom<input className={field} name="firstName" autoComplete="given-name" maxLength={100} required /></label>
      <label className="block">Nom<input className={field} name="lastName" autoComplete="family-name" maxLength={100} required /></label>
      <label className="block">E-mail<input className={field} name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      <label className="block">Mot de passe (8 caractères minimum)<input className={field} name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required /></label>
      {error && <p className="text-red-800" role="alert">{error}</p>}
      <button className={button} disabled={busy}>{busy ? 'Création en cours…' : 'Créer mon compte'}</button>
    </form>
  </main>;
}
