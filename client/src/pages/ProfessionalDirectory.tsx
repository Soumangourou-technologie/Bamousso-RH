import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

type Profile = {
  sector: string;
  city: string;
  description: string;
  address: string;
  email: string;
  phone: string;
  published: boolean;
};

type DirectoryEntry = Omit<Profile, 'published'> & {
  companyId: string;
  company: { name: string };
};

type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  availability: 'ON_REQUEST' | 'AVAILABLE' | 'UNAVAILABLE';
};

const availabilityLabels = {
  ON_REQUEST: 'Disponibilité sur demande',
  AVAILABLE: 'Disponible',
  UNAVAILABLE: 'Indisponible',
};
const priceFormat = new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 2 });

const fields = [
  { key: 'sector', label: 'Secteur d’activité', max: 100 },
  { key: 'city', label: 'Ville', max: 100 },
  { key: 'description', label: 'Produits et services proposés', max: 1000 },
  { key: 'address', label: 'Adresse professionnelle', max: 250 },
  { key: 'email', label: 'E-mail professionnel', max: 254, type: 'email' },
  { key: 'phone', label: 'Téléphone professionnel', max: 35, type: 'tel' },
] as const;

const emptyProfile: Profile = {
  sector: '', city: '', description: '', address: '', email: '', phone: '', published: false,
};
const inputClass = 'w-full rounded-lg border border-gray-400 bg-transparent px-3 py-2';
const buttonClass = 'rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50';

export default function ProfessionalDirectory() {
  const { user } = useAuth();
  const [openCatalog, setOpenCatalog] = useState<string>();
  const [search, setSearch] = useState('');
  const [criteria, setCriteria] = useState({ q: '', page: 1 });
  const [results, setResults] = useState<{ profiles: DirectoryEntry[]; hasMore: boolean }>();
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setResults(undefined);
    setError('');
    api.get('/directory', { params: criteria, signal: controller.signal })
      .then(({ data }) => setResults(data))
      .catch(() => {
        if (!controller.signal.aborted) setError('L’annuaire est temporairement indisponible.');
      });
    return () => controller.abort();
  }, [criteria]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpenCatalog(undefined);
    setCriteria({ q: search.trim(), page: 1 });
  }

  return (
    <main className="min-h-screen bg-white p-6 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <Link to="/" className="underline">Accueil Bamousso</Link>
        <h1 className="text-3xl font-bold">Annuaire Pro</h1>
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1">
            Entreprise, produit, secteur ou ville
            <input className={inputClass} value={search} maxLength={100}
              onChange={(event) => setSearch(event.target.value)} placeholder="Ex. cartons, imprimeur ou Bouaké" />
          </label>
          <button className={buttonClass}>Rechercher</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {!error && !results && <p role="status">Chargement…</p>}
        {results?.profiles.length === 0 && <p>Aucun fournisseur trouvé.</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results?.profiles.map((profile) => (
            <li key={profile.companyId} className="space-y-2 break-words rounded-xl border border-gray-400 p-4">
              <h2 className="text-xl font-bold">{profile.company.name}</h2>
              <p>{profile.sector} · {profile.city}</p>
              {profile.description && <p className="whitespace-pre-wrap">{profile.description}</p>}
              {profile.address && <p>{profile.address}</p>}
              {profile.phone && <p><a className="underline" href={`tel:${profile.phone}`}>{profile.phone}</a></p>}
              {profile.email && <p><a className="underline" href={`mailto:${profile.email}`}>{profile.email}</a></p>}
              <button type="button" className="underline"
                aria-expanded={openCatalog === profile.companyId}
                onClick={() => setOpenCatalog(openCatalog === profile.companyId ? undefined : profile.companyId)}>
                {openCatalog === profile.companyId ? 'Fermer le catalogue' : 'Voir le catalogue'}
              </button>
              {user?.role === 'COMPANY_ADMIN' && user.companyId !== profile.companyId && (
                <Link className="block underline" to={`/annuaire-pro/cotations?fournisseur=${encodeURIComponent(profile.companyId)}`}
                  state={{ supplierName: profile.company.name }}>Demander une cotation</Link>
              )}
              {openCatalog === profile.companyId && <SupplierCatalog companyId={profile.companyId} />}
            </li>
          ))}
        </ul>
        {results && (criteria.page > 1 || results.hasMore) && (
          <nav aria-label="Pages de l’annuaire" className="flex items-center gap-3">
            <button className={buttonClass} disabled={criteria.page === 1}
              onClick={() => setCriteria({ ...criteria, page: criteria.page - 1 })}>Précédente</button>
            <span>Page {criteria.page}</span>
            <button className={buttonClass} disabled={!results.hasMore}
              onClick={() => setCriteria({ ...criteria, page: criteria.page + 1 })}>Suivante</button>
          </nav>
        )}
      </div>
    </main>
  );
}

function SupplierCatalog({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1);
  const [catalog, setCatalog] = useState<{ products: PublicProduct[]; hasMore: boolean }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCatalog(undefined);
    setFailed(false);
    api.get(`/directory/${encodeURIComponent(companyId)}/catalog`, {
      params: { page }, signal: controller.signal,
    }).then(({ data }) => setCatalog(data))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [companyId, page]);

  return (
    <div className="space-y-3 border-t border-gray-400 pt-3">
      {failed && <p role="alert">Ce catalogue est indisponible.</p>}
      {!failed && !catalog && <p role="status">Chargement du catalogue…</p>}
      {catalog?.products.length === 0 && <p>Aucun article publié sur cette page.</p>}
      {catalog?.products.map((product) => (
        <article key={product.id} className="space-y-1 rounded-lg border border-gray-300 p-2">
          {product.imageUrl && <img src={product.imageUrl} alt={product.name} loading="lazy"
            referrerPolicy="no-referrer" className="h-28 w-full rounded object-contain" />}
          <h3 className="font-semibold">{product.name}</h3>
          {product.description && <p>{product.description}</p>}
          <p>{product.price === null ? 'Sur devis' : `${priceFormat.format(product.price)} FCFA HT`}</p>
          <p className="text-sm">{availabilityLabels[product.availability]}</p>
        </article>
      ))}
      {catalog && (page > 1 || catalog.hasMore) && (
        <nav aria-label="Pages du catalogue" className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={page === 1} onClick={() => setPage(page - 1)}>Précédente</button>
          <button className={buttonClass} disabled={!catalog.hasMore} onClick={() => setPage(page + 1)}>Suivante</button>
        </nav>
      )}
    </div>
  );
}

export function SupplierProfileEditor() {
  const [profile, setProfile] = useState<Profile>();
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/directory/my-profile', { signal: controller.signal })
      .then(({ data }) => {
        setCompanyName(data.name);
        setProfile(data.supplierProfile ?? emptyProfile);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Impossible de charger la fiche.');
      });
    return () => controller.abort();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put<Profile>('/directory/my-profile', profile);
      setProfile(data);
      setNotice(data.published ? 'Fiche publiée dans l’annuaire.' : 'Fiche enregistrée en brouillon.');
    } catch (failure) {
      const response = failure as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message ?? 'Impossible d’enregistrer la fiche.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4 p-4">
      <Link to="/annuaire-pro" className="underline">Consulter l’Annuaire Pro</Link>
      <h1 className="text-2xl font-bold">Ma fiche fournisseur</h1>
      <Link to="/sales/products" className="inline-block underline">Gérer mes produits et services</Link>
      {companyName && <p>{companyName}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!profile && !error && <p role="status">Chargement…</p>}
      {profile && (
        <form onSubmit={save}>
          <fieldset disabled={saving} className="space-y-4">
            <p>Renseignez uniquement les coordonnées que vous souhaitez rendre publiques.</p>
            {fields.map((field) => (
              <label key={field.key} className="block">
                {field.label}
                <input className={inputClass} value={profile[field.key]}
                  type={'type' in field ? field.type : 'text'} maxLength={field.max}
                  required={profile.published && (field.key === 'sector' || field.key === 'city')}
                  onChange={(event) => setProfile({ ...profile, [field.key]: event.target.value })} />
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profile.published}
                onChange={(event) => setProfile({ ...profile, published: event.target.checked })} />
              Rendre cette fiche visible dans l’annuaire public
            </label>
            <button className={buttonClass}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
