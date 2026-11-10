import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_URL } from '../utils/api';

type Job = { id: string; title: string; location: string; description: string; email: string; published?: boolean; company: { name: string } };
type Candidate = { userId: string; headline: string; city: string; user: { firstName: string; lastName: string; email: string } };
type Profile = { headline: string; city: string; visible: boolean; hasCv: boolean };
const box = 'space-y-4 rounded-xl border border-slate-200 bg-white p-5';
const button = 'inline-block rounded-lg bg-teal-800 px-4 py-2 font-semibold text-white hover:bg-teal-900 disabled:opacity-50';
const link = 'font-semibold text-teal-800 underline';
const field = 'mt-1 block w-full rounded-lg border border-slate-400 bg-white p-2 text-slate-900';

function errorMessage(error: unknown) {
  return isAxiosError(error) && typeof error.response?.data?.message === 'string'
    ? error.response.data.message : 'L’action n’a pas abouti. Réessayez.';
}

function Frame({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-5">
      <nav className="flex flex-wrap items-center gap-4" aria-label="Navigation de l’espace">
        <Link className={link} to="/">Accueil Bamousso</Link>
        {user && <Link className={link} to="/dashboard">Mon espace</Link>}
        {user && <button className={link} onClick={logout}>Se déconnecter</button>}
      </nav>
      <header className="space-y-2 rounded-xl bg-teal-950 p-6 text-white">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {description && <p>{description}</p>}
      </header>
      {children}
    </div>
  </main>;
}

const companyLinks = [
  ['Bamousso RH', 'Présences, congés, tâches et gestion des équipes.', '/dashboard/admin'],
  ['Référencer mon activité', 'Publiez votre fiche et gérez votre visibilité.', '/annuaire-pro/ma-fiche'],
  ['Trouver des prestataires', 'Explorez les fiches et catalogues de l’Annuaire Pro.', '/annuaire-pro'],
  ['Recruter', 'Publiez vos offres et recherchez des candidats.', '/espace-entreprise/recrutement'],
  ['Former mon équipe', 'Inscrivez vos collaborateurs et suivez leur progression.', '/academie/equipe'],
  ['Cotations et commandes', 'Suivez vos demandes de devis et vos commandes.', '/annuaire-pro/cotations'],
];

export function CompanyWorkspace() {
  const { company } = useAuth();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function feature() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/directory/feature');
      setNotice(`Mise en avant active jusqu’au ${new Intl.DateTimeFormat('fr-CI', { dateStyle: 'long', timeZone: 'Africa/Abidjan' }).format(new Date(data.featuredUntil))}.`);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <Frame title={company?.name ? `Espace entreprise · ${company.name}` : 'Espace entreprise'} description="Retrouvez les outils de gestion, de visibilité, de recrutement et de formation de votre entreprise.">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {companyLinks.map(([name, description, path]) => <section className={box} key={path}>
        <h2 className="text-xl font-bold text-slate-900"><Link className={link} to={path}>{name}</Link></h2><p>{description}</p>
        {path === '/annuaire-pro/cotations' && <Link className={link} to="/annuaire-pro/commandes">Voir les commandes</Link>}
      </section>)}
    </div>
    <section className={box}>
      <h2 className="text-xl font-bold text-slate-900">Mettre en avant mon activité</h2>
      <p>Ajoutez votre fiche publiée à la sélection de l’Annuaire Pro pendant sept jours. La sélection affiche jusqu’à six fiches actives.</p>
      <button className={button} disabled={busy} onClick={() => void feature()}>Activer la mise en avant</button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert" className="text-red-800">{error}</p>}
    </section>
  </Frame>;
}

export function PersonalWorkspace() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>();
  const [file, setFile] = useState<File>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get<Profile>('/careers/me', { signal: controller.signal }).then(({ data }) => setProfile(data))
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, []);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const { headline, city } = Object.fromEntries(data);
    const visible = data.get('visible') === 'on';
    void run(async () => {
      // Une demande de retrait du partage s’applique même si le nouveau fichier est rejeté.
      if (!file || !visible) {
        await api.put('/careers/me', { headline, city, visible });
        setProfile({ headline: String(headline), city: String(city), visible, hasCv: profile.hasCv });
      } else if (!profile.headline || !profile.city) {
        await api.put('/careers/me', { headline, city, visible: false });
      }
      if (file) {
        const upload = new FormData();
        upload.append('cv', file);
        await api.put('/careers/me/cv', upload);
        if (visible) await api.put('/careers/me', { headline, city, visible });
      }
      setProfile({ headline: String(headline), city: String(city), visible, hasCv: profile.hasCv || Boolean(file) });
      setFile(undefined);
      const input = form.elements.namedItem('cv');
      if (input instanceof HTMLInputElement) input.value = '';
    }, 'Profil enregistré.');
  }

  return <Frame title={`Mon espace personnel${user?.firstName ? ` · ${user.firstName}` : ''}`} description="Trouvez une opportunité, préparez votre candidature et développez vos compétences.">
    <div className="flex flex-wrap gap-3">
      <Link className={button} to="/emploi">Voir les offres d’emploi</Link>
      <Link className={button} to="/academie">Suivre une formation</Link>
    </div>
    <section className={box}>
      <h2 className="text-xl font-bold text-slate-900">Mon profil candidat et mon CV</h2>
      {error && <p role="alert" className="text-red-800">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {profile && <form className="space-y-3" onSubmit={save}>
        <label className="block">Métier recherché<input className={field} name="headline" defaultValue={profile.headline} maxLength={140} required /></label>
        <label className="block">Ville<input className={field} name="city" defaultValue={profile.city} maxLength={100} required /></label>
        <label className="block">CV au format PDF (2 Mo maximum)<input className={field} name="cv" type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0])} /></label>
        <label className="flex items-start gap-2"><input type="checkbox" name="visible" defaultChecked={profile.visible} className="mt-1" />
          J’autorise les administrateurs d’entreprise à voir mon profil, mon e-mail et à télécharger mon CV. Je peux retirer cet accès à tout moment depuis cet espace.
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <button className={button} disabled={busy}>Enregistrer</button>
          {profile.hasCv && <>
            <a className={link} href={`${API_URL}/api/careers/me/cv`}>Télécharger mon CV</a>
            <button type="button" className="text-red-800 underline" disabled={busy} onClick={() => void run(async () => {
              await api.delete('/careers/me/cv');
              setProfile({ ...profile, hasCv: false });
            }, 'CV retiré.')}>Retirer mon CV</button>
          </>}
        </div>
      </form>}
    </section>
  </Frame>;
}

function PagedList<T>({ path, search, render }: { path: string; search?: string; render: (row: T, reload: () => void) => ReactNode }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{ rows: T[]; hasMore: boolean }>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError('');
    api.get<{ rows: T[]; hasMore: boolean }>(path, { params: { q: query, page }, signal: controller.signal })
      .then(({ data }) => setData(data))
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    return () => controller.abort();
  }, [path, query, page, revision]);

  return <div className="space-y-3">
    {search && <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault();
      setQuery(String(new FormData(event.currentTarget).get('q') ?? '').trim());
      setPage(1);
    }}>
      <label className="flex-1">{search}<input className={field} name="q" maxLength={100} /></label>
      <button className={button}>Rechercher</button>
    </form>}
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {!error && !data && <p role="status">Chargement…</p>}
    {data?.rows.length === 0 && <p>Aucun résultat sur cette page.</p>}
    <div className="grid gap-3">{data?.rows.map(row => render(row, () => setRevision(value => value + 1)))}</div>
    {(page > 1 || data?.hasMore) && <nav className="flex flex-wrap items-center gap-3" aria-label="Pagination">
      <button className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Précédent</button>
      <span>Page {page}</span>
      <button className={button} disabled={!data?.hasMore} onClick={() => setPage(page + 1)}>Suivant</button>
    </nav>}
  </div>;
}

export function JobsPage() {
  return <Frame title="Offres d’emploi" description="Découvrez les postes publiés par les entreprises sur Bamousso.">
    <PagedList<Job> path="/careers/jobs" search="Poste, entreprise ou ville" render={job => (
      <article className={box} key={job.id}>
        <h2 className="text-xl font-bold text-slate-900">{job.title}</h2>
        <p>{job.company.name} · {job.location}</p>
        <p className="whitespace-pre-wrap break-words">{job.description}</p>
        <a className={link} href={`mailto:${job.email}?subject=${encodeURIComponent(`Candidature – ${job.title}`)}`}>Candidater par e-mail</a>
      </article>
    )} />
  </Frame>;
}

export function RecruitmentWorkspace() {
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.post('/careers/company/jobs', Object.fromEntries(new FormData(form)));
      form.reset();
      setRevision(value => value + 1);
      setNotice('Offre publiée.');
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  return <Frame title="Recruter sur Bamousso">
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <form className={box} onSubmit={publish}>
      <h2 className="text-xl font-bold text-slate-900">Publier une offre d’emploi</h2>
      <label className="block">Poste<input className={field} name="title" maxLength={140} required /></label>
      <label className="block">Lieu<input className={field} name="location" maxLength={100} required /></label>
      <label className="block">Description<textarea className={field} name="description" maxLength={5000} required /></label>
      <label className="block">E-mail public de candidature<input className={field} name="email" type="email" maxLength={254} required /></label>
      <button className={button} disabled={busy}>Publier</button>
    </form>
    <section className={box}>
      <h2 className="text-xl font-bold text-slate-900">Mes offres</h2>
      <PagedList<Job> key={revision} path="/careers/company/jobs" render={(job, reload) => (
        <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-3">
          <strong>{job.title}</strong>
          {job.published ? <button className="text-red-800 underline" type="button" onClick={() => {
            void api.delete(`/careers/company/jobs/${encodeURIComponent(job.id)}`).then(() => {
              setNotice('Offre retirée.'); reload();
            }).catch(error => setError(errorMessage(error)));
          }}>Retirer l’offre</button> : <span>Retirée</span>}
        </div>
      )} />
    </section>
    <section className={box}>
      <h2 className="text-xl font-bold text-slate-900">Rechercher des candidats</h2>
      <p>Seuls les profils dont le propriétaire a choisi de partager son CV apparaissent ici.</p>
      <PagedList<Candidate> path="/careers/company/candidates" search="Métier ou ville" render={candidate => (
        <article key={candidate.userId} className="space-y-2 rounded border border-slate-200 p-3">
          <h3 className="font-bold text-slate-900">{candidate.user.firstName} {candidate.user.lastName}</h3>
          <p>{candidate.headline} · {candidate.city}</p>
          <div className="flex flex-wrap gap-3">
            <a className={link} href={`mailto:${candidate.user.email}`}>Contacter</a>
            <a className={link} href={`${API_URL}/api/careers/company/candidates/${encodeURIComponent(candidate.userId)}/cv`}>Télécharger le CV</a>
          </div>
        </article>
      )} />
    </section>
  </Frame>;
}
