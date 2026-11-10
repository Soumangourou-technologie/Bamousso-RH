import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

type Quote = {
  id: string;
  buyerName: string;
  supplierName: string;
  supplierId: string | null;
  need: string;
  quantity: number;
  location: string;
  requestedBy: string;
  status: 'REQUESTED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED';
  totalFcfa: number | null;
  terms: string | null;
  validUntil: string | null;
  order: { id: string } | null;
};

const input = 'block w-full rounded border border-gray-400 bg-transparent px-3 py-2';
const button = 'rounded bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50';
const statuses = {
  REQUESTED: 'En attente de devis', QUOTED: 'Devis disponible',
  ACCEPTED: 'Commande créée', DECLINED: 'Refusée',
};
const money = new Intl.NumberFormat('fr-CI');

function message(error: unknown) {
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message
    ?? 'L’opération a échoué. Réessaie dans un instant.';
}

export default function SupplierQuotes() {
  const [params, setParams] = useSearchParams();
  const supplierId = params.get('fournisseur');
  const location = useLocation();
  const supplierName = (location.state as { supplierName?: string } | null)?.supplierName;
  const [direction, setDirection] = useState<'sent' | 'received'>('sent');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ quotes: Quote[]; hasMore: boolean }>();
  const [failure, setFailure] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setFailure('');
    setList(undefined);
    api.get('/supplier-quotes', { params: { direction, page }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setList(data); })
      .catch((error) => { if (!controller.signal.aborted) setFailure(message(error)); });
    return () => controller.abort();
  }, [direction, page, refresh]);

  function reload() {
    setRefresh((value) => value + 1);
  }

  return (
    <section className="mx-auto max-w-4xl space-y-4 p-4">
      <Link to="/annuaire-pro" className="underline">Rechercher un fournisseur</Link>
      <h1 className="text-2xl font-bold">Cotations et commandes</h1>
      {supplierId && (
        <QuoteRequest key={supplierId} supplierId={supplierId} supplierName={supplierName}
          onSent={() => { setParams({}); setDirection('sent'); setPage(1); reload(); }} />
      )}
      <label className="block max-w-xs">
        Dossiers
        <select className={input} value={direction} onChange={(event) => {
          setDirection(event.target.value === 'sent' ? 'sent' : 'received');
          setPage(1);
        }}>
          <option value="sent">Demandes envoyées</option>
          <option value="received">Demandes reçues</option>
        </select>
      </label>
      {failure && <p role="alert">{failure} <button className="underline" onClick={reload}>Réessayer</button></p>}
      {!failure && !list && <p role="status">Chargement…</p>}
      {list?.quotes.length === 0 && <p>Aucun dossier sur cette page.</p>}
      {list?.quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} sent={direction === 'sent'} onChange={reload} />)}
      {list && (page > 1 || list.hasMore) && (
        <nav aria-label="Pages des cotations" className="flex gap-2">
          <button className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>Précédente</button>
          <button className={button} disabled={!list.hasMore} onClick={() => setPage(page + 1)}>Suivante</button>
        </nav>
      )}
    </section>
  );
}

function QuoteRequest({ supplierId, supplierName, onSent }: { supplierId: string; supplierName?: string; onSent: () => void }) {
  const [id] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setFailure('');
    try {
      await api.post('/supplier-quotes', {
        id, supplierId, need: values.get('need'), quantity: Number(values.get('quantity')),
        location: values.get('location'), requestedBy: values.get('requestedBy'),
      });
      onSent();
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="space-y-2 rounded-lg border border-gray-400 p-4">
      <h2 className="text-lg font-semibold">Nouvelle demande de cotation{supplierName && ` · ${supplierName}`}</h2>
      {failure && <p role="alert">{failure}</p>}
      <fieldset disabled={busy} className="space-y-2">
        <label className="block">Besoin<textarea className={input} name="need" required minLength={5} maxLength={2000} /></label>
        <label className="block">Quantité<input className={input} name="quantity" type="number" required min={1} max={1000000} /></label>
        <label className="block">Lieu de livraison ou de prestation<input className={input} name="location" required maxLength={180} /></label>
        <label className="block">Délai souhaité<input className={input} name="requestedBy" required maxLength={180} /></label>
        <button className={button}>Envoyer la demande</button>
      </fieldset>
    </form>
  );
}

function QuoteCard({ quote, sent, onChange }: { quote: Quote; sent: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const expired = quote.validUntil !== null && Date.parse(quote.validUntil) <= Date.now();

  async function act(action: 'response' | 'accept' | 'decline', values?: FormData) {
    if (busy) return;
    setBusy(true);
    setFailure('');
    const url = `/supplier-quotes/${quote.id}/${action}`;
    try {
      if (values) {
        await api.put(url, { totalFcfa: Number(values.get('total')), terms: values.get('terms'), validDays: Number(values.get('validDays')) });
      } else {
        await api.post(url);
      }
      onChange();
    } catch (error) {
      setFailure(message(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="space-y-2 break-words rounded-lg border border-gray-400 p-4">
      <h2 className="font-semibold">{sent ? quote.supplierName : quote.buyerName}</h2>
      <p>{expired && quote.status === 'QUOTED' ? 'Devis expiré' : statuses[quote.status]}</p>
      <p className="whitespace-pre-wrap">{quote.need}</p>
      <p>Quantité {quote.quantity} · {quote.location} · Délai souhaité {quote.requestedBy}</p>
      {quote.totalFcfa !== null && <p className="font-semibold">Total du devis {money.format(quote.totalFcfa)} FCFA</p>}
      {quote.terms && <p className="whitespace-pre-wrap">{quote.terms}</p>}
      {quote.validUntil && <p>Valable jusqu’au {new Date(quote.validUntil).toLocaleString('fr-CI', { timeZone: 'Africa/Abidjan' })} (Abidjan)</p>}
      {quote.order && <p>Référence de commande {quote.order.id}</p>}
      {failure && <p role="alert">{failure}</p>}
      {!sent && quote.status === 'REQUESTED' && (
        <form onSubmit={(event) => { event.preventDefault(); void act('response', new FormData(event.currentTarget)); }}>
          <fieldset disabled={busy} className="space-y-2">
            <label className="block">Total à payer en FCFA<input className={input} name="total" type="number" min={1} max={2147483647} required /></label>
            <label className="block">Conditions et délai proposé<textarea className={input} name="terms" minLength={5} maxLength={2000} required /></label>
            <label className="block">Validité en jours<input className={input} name="validDays" type="number" min={1} max={90} defaultValue={7} required /></label>
            <div className="flex flex-wrap gap-2">
              <button className={button}>Envoyer le devis</button>
              <button type="button" className="underline" onClick={() => void act('decline')}>Refuser la demande</button>
            </div>
          </fieldset>
        </form>
      )}
      {sent && quote.status === 'QUOTED' && !expired && quote.supplierId && (
        <div className="flex flex-wrap gap-2">
          <button className={button} disabled={busy} onClick={() => void act('accept')}>Accepter et créer la commande</button>
          <button className="underline" disabled={busy} onClick={() => void act('decline')}>Refuser le devis</button>
        </div>
      )}
    </article>
  );
}
