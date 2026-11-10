import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const inputClass = 'block w-full rounded border border-gray-400 bg-transparent px-3 py-2';
const buttonClass = 'rounded bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50';
const currency = new Intl.NumberFormat('fr-CI', { maximumFractionDigits: 2 });
const labels = { PENDING: 'En attente', CONFIRMED: 'Confirmée', DECLINED: 'Refusée' };

type Order = {
  id: string;
  buyerName: string;
  supplierName: string;
  productName: string;
  quantity: number;
  total: string;
  deliveryAddress: string;
  status: keyof typeof labels;
  response: string | null;
};

function errorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'L’opération a échoué. Réessaie dans un instant.';
}

export function DirectOrderForm({ supplierId, productId, price, vatRate }: {
  supplierId: string; productId: string; price: number; vatRate: number;
}) {
  const [id] = useState(() => crypto.randomUUID());
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const total = Number(quantity) * price * (1 + vatRate / 100);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const deliveryAddress = new FormData(event.currentTarget).get('address');
    setBusy(true);
    setError('');
    try {
      await api.post('/direct-orders', {
        id, supplierId, productId, deliveryAddress, quantity: Number(quantity),
        expectedPrice: price, expectedVat: vatRate,
      });
      setSubmitted(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return (
    <p role="status">Commande envoyée. <Link className="underline" to="/annuaire-pro/commandes">Suivre la commande</Link></p>
  );

  return (
    <form onSubmit={submit} className="space-y-2">
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy} className="space-y-2">
        <label className="block">
          Quantité
          <input className={inputClass} type="number" min={1} max={1000000} required
            value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </label>
        <label className="block">
          Adresse de livraison
          <input className={inputClass} name="address" required minLength={3} maxLength={250} />
        </label>
        <p>Total {currency.format(total)} FCFA TTC, hors frais de livraison éventuels.</p>
        <button className={buttonClass}>Envoyer la commande</button>
      </fieldset>
    </form>
  );
}

export default function DirectOrders() {
  const [direction, setDirection] = useState<'sent' | 'received'>('sent');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ orders: Order[]; hasMore: boolean }>();
  const [failure, setFailure] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setResult(undefined);
    setFailure('');
    api.get('/direct-orders', { params: { direction, page }, signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setResult(data); })
      .catch((error) => { if (!controller.signal.aborted) setFailure(errorMessage(error)); });
    return () => controller.abort();
  }, [direction, page, refresh]);

  return (
    <section className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap gap-4">
        <Link className="underline" to="/annuaire-pro">Annuaire Pro</Link>
        <Link className="underline" to="/annuaire-pro/cotations">Commandes sur devis</Link>
      </div>
      <h1 className="text-2xl font-bold">Commandes directes</h1>
      <label className="block max-w-xs">
        Commandes
        <select className={inputClass} value={direction} onChange={(event) => {
          setDirection(event.target.value === 'received' ? 'received' : 'sent');
          setPage(1);
        }}>
          <option value="sent">Envoyées</option>
          <option value="received">Reçues</option>
        </select>
      </label>
      {failure && <p role="alert">{failure} <button className="underline" onClick={() => setRefresh(refresh + 1)}>Réessayer</button></p>}
      {!failure && !result && <p role="status">Chargement…</p>}
      {result?.orders.length === 0 && <p>Aucune commande sur cette page.</p>}
      {result?.orders.map((order) => (
        <article key={order.id} className="space-y-2 break-words rounded-lg border border-gray-400 p-4">
          <h2 className="font-semibold">{order.productName} · {direction === 'sent' ? order.supplierName : order.buyerName}</h2>
          <p>{labels[order.status]} · Quantité {order.quantity} · {currency.format(Number(order.total))} FCFA TTC</p>
          <p>Livraison à {order.deliveryAddress}</p>
          <p className="text-sm">Référence {order.id}</p>
          {order.response && <p>{order.response}</p>}
          {direction === 'received' && order.status === 'PENDING' && (
            <OrderDecision id={order.id} onSaved={() => setRefresh((value) => value + 1)} />
          )}
        </article>
      ))}
      {result && (page > 1 || result.hasMore) && (
        <nav aria-label="Pages des commandes" className="flex gap-2">
          <button className={buttonClass} disabled={page === 1} onClick={() => setPage(page - 1)}>Précédente</button>
          <button className={buttonClass} disabled={!result.hasMore} onClick={() => setPage(page + 1)}>Suivante</button>
        </nav>
      )}
    </section>
  );
}

function OrderDecision({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [status, setStatus] = useState('CONFIRMED');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const response = new FormData(event.currentTarget).get('response');
    setBusy(true);
    setFailure('');
    try {
      await api.put(`/direct-orders/${id}/decision`, { status, response });
      onSaved();
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {failure && <p role="alert">{failure}</p>}
      <fieldset disabled={busy} className="space-y-2">
        <label className="block">Décision
          <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="CONFIRMED">Confirmer la disponibilité</option>
            <option value="DECLINED">Refuser</option>
          </select>
        </label>
        <label className="block">
          {status === 'CONFIRMED' ? 'Délai de livraison proposé' : 'Motif du refus'}
          <input className={inputClass} name="response" required minLength={3} maxLength={500} />
        </label>
        <button className={buttonClass}>Enregistrer la décision</button>
      </fieldset>
    </form>
  );
}
