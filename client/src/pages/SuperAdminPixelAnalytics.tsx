import { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Activity,
  Target,
  TrendingUp,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Eye,
  Users,
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle,
  Sliders,
  Zap,
  Globe,
  BarChart2,
  Phone,
  Mail
} from 'lucide-react';

interface PixelConfig {
  pixelId: string;
  conversionsApiToken?: string;
  testEventCode?: string;
  isEnabled: boolean;
  isCapiEnabled: boolean;
  trackPageViews: boolean;
  trackRegistrations: boolean;
  trackSubscribes: boolean;
}

interface PixelEventLog {
  id: string;
  eventName: string;
  eventSource: string;
  userIp?: string;
  url?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  customData?: any;
  status: string;
  capiResponse?: any;
  createdAt: string;
}

interface AnalyticsData {
  config: {
    pixelId: string;
    isEnabled: boolean;
    isCapiEnabled: boolean;
    hasCapiToken: boolean;
    testEventCode?: string;
  };
  kpis: {
    totalEvents: number;
    browserEvents: number;
    capiEvents: number;
    leadCount: number;
    registrationCount: number;
    subscribeCount: number;
  };
  funnel: {
    pageViews: number;
    leads: number;
    registrations: number;
    subscribes: number;
    leadConversionRate: string;
    registrationConversionRate: string;
    subscribeConversionRate: string;
  };
  eventBreakdown: Record<string, number>;
  campaignBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  recentEvents: PixelEventLog[];
}

export default function SuperAdminPixelAnalytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'stream' | 'config' | 'test'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  
  // Config state
  const [configForm, setConfigForm] = useState<PixelConfig>({
    pixelId: '3595484767284161',
    conversionsApiToken: '',
    testEventCode: '',
    isEnabled: true,
    isCapiEnabled: true,
    trackPageViews: true,
    trackRegistrations: true,
    trackSubscribes: true,
  });

  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Test Event state
  const [testEventName, setTestEventName] = useState<string>('PageView');
  const [customTestCode, setCustomTestCode] = useState<string>('');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Search & Filter state for Stream tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchAnalyticsAndConfig();
  }, []);

  const fetchAnalyticsAndConfig = async () => {
    setLoading(true);
    try {
      const [analyticsRes, configRes] = await Promise.all([
        api.get('/meta-pixel/analytics'),
        api.get('/meta-pixel/config'),
      ]);

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      if (configRes.data) {
        setConfigForm(configRes.data);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des analytics Meta Pixel:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccess('');
    try {
      await api.put('/meta-pixel/config', configForm);
      setSaveSuccess('Configuration Meta Pixel mise à jour avec succès !');
      fetchAnalyticsAndConfig();
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Erreur sauvegarde config:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTestEvent = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.post('/meta-pixel/test-event', {
        eventName: testEventName,
        testCode: customTestCode || configForm.testEventCode,
      });
      setTestResult(res.data);
      fetchAnalyticsAndConfig();
    } catch (err: any) {
      setTestResult({ error: err.response?.data?.error || 'Erreur d’envoi' });
    } finally {
      setSendingTest(false);
    }
  };

  const codeSnippet = `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${configForm.pixelId || '3595484767284161'}');
fbq('track', 'PageView');
</script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  // Filtrage du journal des événements
  const filteredEvents = (analytics?.recentEvents || []).filter((ev) => {
    const matchesSearch =
      searchQuery === '' ||
      ev.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.url && ev.url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.utmCampaign && ev.utmCampaign.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.utmSource && ev.utmSource.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesEventFilter =
      selectedEventFilter === 'ALL' || ev.eventName === selectedEventFilter;

    return matchesSearch && matchesEventFilter;
  });

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto pb-16">
      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-r from-[#1E1512] via-[#2A1B16] to-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg text-white">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Analyse & Pixel Meta (Facebook Ads)
              </h1>
              <p className="text-xs text-gray-400">
                Suivi en temps réel des prospects, clics publicitaires, inscriptions et conversions CAPI
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
            <span className="text-xs font-bold text-gray-300">ID Pixel :</span>
            <span className="text-xs font-mono font-black text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-lg border border-brand-primary/30">
              {analytics?.config.pixelId || configForm.pixelId}
            </span>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${analytics?.config.isEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            <span className={`w-2 h-2 rounded-full ${analytics?.config.isEnabled ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
            {analytics?.config.isEnabled ? 'Pixel Actif' : 'Désactivé'}
          </div>

          <button
            onClick={fetchAnalyticsAndConfig}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition border border-white/10 flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all ${
            activeTab === 'overview'
              ? 'bg-brand-primary text-white border-t-2 border-brand-primary shadow-lg shadow-brand-primary/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Vue d'Ensemble & Funnel
        </button>

        <button
          onClick={() => setActiveTab('stream')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all ${
            activeTab === 'stream'
              ? 'bg-brand-primary text-white border-t-2 border-brand-primary shadow-lg shadow-brand-primary/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          Journal Événements Temps Réel
          {analytics?.recentEvents && (
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-mono">
              {analytics.recentEvents.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all ${
            activeTab === 'config'
              ? 'bg-brand-primary text-white border-t-2 border-brand-primary shadow-lg shadow-brand-primary/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Configuration Pixel & CAPI
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-bold text-sm transition-all ${
            activeTab === 'test'
              ? 'bg-brand-primary text-white border-t-2 border-brand-primary shadow-lg shadow-brand-primary/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          Test d'Événement Meta
        </button>
      </div>

      {/* CONTENU ONGLET 1 : VUE D'ENSEMBLE & FUNNEL */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Cartes KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-[#1A0F0A] p-5 rounded-2xl border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Événements</span>
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-black text-white">{analytics?.kpis.totalEvents || 0}</div>
              <div className="text-[11px] text-gray-400 flex items-center justify-between pt-2 border-t border-white/5">
                <span>Navigateur : <strong className="text-blue-400">{analytics?.kpis.browserEvents || 0}</strong></span>
                <span>CAPI Serveur : <strong className="text-indigo-400">{analytics?.kpis.capiEvents || 0}</strong></span>
              </div>
            </div>

            <div className="bg-[#1A0F0A] p-5 rounded-2xl border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider">Leads & Contacts Clics</span>
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400">{analytics?.kpis.leadCount || 0}</div>
              <div className="text-[11px] text-gray-400 pt-2 border-t border-white/5">
                Formulaires prospects & clics redirection pub
              </div>
            </div>

            <div className="bg-[#1A0F0A] p-5 rounded-2xl border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider">Comptes Entreprise Créés</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400">{analytics?.kpis.registrationCount || 0}</div>
              <div className="text-[11px] text-gray-400 pt-2 border-t border-white/5">
                Inscriptions SaaS terminées (CompleteRegistration)
              </div>
            </div>

            <div className="bg-[#1A0F0A] p-5 rounded-2xl border border-white/10 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold uppercase tracking-wider">Abonnements Payés</span>
                <CreditCard className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-purple-400">{analytics?.kpis.subscribeCount || 0}</div>
              <div className="text-[11px] text-gray-400 pt-2 border-t border-white/5">
                Conversions d'achats / Abonnements (Subscribe/Purchase)
              </div>
            </div>
          </div>

          {/* Entonnoir de conversion (Funnel) */}
          <div className="bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-brand-primary" />
                  Entonnoir de Conversion des Pubs Meta (Funnel)
                </h3>
                <p className="text-xs text-gray-400">Du premier clic pub au paiement de l'abonnement</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Étape 1 */}
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase">Étape 1</span>
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-300">Visites de Pages (PageView)</div>
                  <div className="text-2xl font-black text-white mt-1">{analytics?.funnel.pageViews || 0}</div>
                </div>
                <div className="text-[11px] text-gray-400 bg-white/5 p-2 rounded-xl">
                  Redirection initiale depuis les publicités Facebook
                </div>
              </div>

              {/* Étape 2 */}
              <div className="bg-white/5 p-5 rounded-2xl border border-amber-500/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase">Étape 2</span>
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-300">Intérêt & Prospect (Lead)</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">{analytics?.funnel.leads || 0}</div>
                </div>
                <div className="text-[11px] text-amber-400/80 bg-amber-500/10 p-2 rounded-xl font-semibold">
                  Taux de conversion : <strong>{analytics?.funnel.leadConversionRate || 0}%</strong>
                </div>
              </div>

              {/* Étape 3 */}
              <div className="bg-white/5 p-5 rounded-2xl border border-emerald-500/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Étape 3</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-300">Inscriptions SaaS</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{analytics?.funnel.registrations || 0}</div>
                </div>
                <div className="text-[11px] text-emerald-400/80 bg-emerald-500/10 p-2 rounded-xl font-semibold">
                  Taux de conversion : <strong>{analytics?.funnel.registrationConversionRate || 0}%</strong>
                </div>
              </div>

              {/* Étape 4 */}
              <div className="bg-white/5 p-5 rounded-2xl border border-purple-500/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase">Étape 4</span>
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-300">Abonnements Réglés</div>
                  <div className="text-2xl font-black text-purple-400 mt-1">{analytics?.funnel.subscribes || 0}</div>
                </div>
                <div className="text-[11px] text-purple-400/80 bg-purple-500/10 p-2 rounded-xl font-semibold">
                  Taux de conversion final : <strong>{analytics?.funnel.subscribeConversionRate || 0}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition par Campagne UTM & Événements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Campagnes Publicitaires */}
            <div className="bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Performance des Campagnes UTM (`utm_campaign`)
              </h3>

              {Object.keys(analytics?.campaignBreakdown || {}).length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  Aucune donnée de campagne UTM enregistrée pour le moment.
                  <p className="mt-1 text-[11px] text-gray-500">
                    Ajoutez `?utm_campaign=NomDeVotrePub` aux liens de vos publicités Facebook.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics?.campaignBreakdown || {}).map(([campaign, count]) => (
                    <div key={campaign} className="flex items-center justify-between bg-white/5 p-3.5 rounded-xl border border-white/5">
                      <span className="text-xs font-bold text-gray-200 font-mono">{campaign}</span>
                      <span className="text-xs font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
                        {count} événements
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Répartition des types d'événements */}
            <div className="bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Répartition des Événements Déclenchés
              </h3>

              {Object.keys(analytics?.eventBreakdown || {}).length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  Aucun événement enregistré.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(analytics?.eventBreakdown || {}).map(([event, count]) => (
                    <div key={event} className="flex items-center justify-between bg-white/5 p-3.5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold text-white">{event}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-300 font-mono bg-white/10 px-3 py-1 rounded-full">
                        {count} fois
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 2 : JOURNAL DES ÉVÉNEMENTS (STREAM) */}
      {activeTab === 'stream' && (
        <div className="bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-primary" />
                Journal des Événements Meta en Temps Réel
              </h3>
              <p className="text-xs text-gray-400">Stream des 100 derniers événements reçus (Client & CAPI)</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Rechercher URL, UTM..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary w-48 md:w-64"
                />
              </div>

              {/* Filtre d'événement */}
              <select
                value={selectedEventFilter}
                onChange={(e) => setSelectedEventFilter(e.target.value)}
                className="bg-[#2A1B16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="ALL">Tous les événements</option>
                <option value="PageView">PageView</option>
                <option value="Lead">Lead</option>
                <option value="ProspectClick">ProspectClick</option>
                <option value="CompleteRegistration">CompleteRegistration</option>
                <option value="Subscribe">Subscribe</option>
              </select>
            </div>
          </div>

          {/* Tableau du stream */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Date & Heure</th>
                  <th className="py-3 px-4">Événement</th>
                  <th className="py-3 px-4">Contact / Coordonnées Capturées</th>
                  <th className="py-3 px-4">Campagne UTM</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 rounded-r-xl">Statut CAPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                      Aucun événement correspondant aux critères.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => {
                    const cData = ev.customData || {};
                    const hasContact = cData.name || cData.email || cData.phone || cData.companyName;

                    return (
                      <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-gray-400">
                          {new Date(ev.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg">
                            {ev.eventName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {hasContact ? (
                            <div className="bg-brand-primary/10 border border-brand-primary/20 p-2 rounded-xl text-[11px] space-y-1">
                              {cData.name && (
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                                  <span>{cData.name}</span>
                                  {cData.companyName && <span className="text-gray-400 font-normal">({cData.companyName})</span>}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 text-[10px] text-gray-300">
                                {cData.phone && (
                                  <a href={`tel:${cData.phone}`} className="flex items-center gap-1 text-emerald-400 hover:underline">
                                    <Phone className="w-3 h-3" />
                                    {cData.phone}
                                  </a>
                                )}
                                {cData.email && (
                                  <a href={`mailto:${cData.email}`} className="flex items-center gap-1 text-blue-400 hover:underline truncate max-w-xs">
                                    <Mail className="w-3 h-3" />
                                    {cData.email}
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">Visiteur Anonyme</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-brand-primary font-semibold">
                          {ev.utmCampaign || ev.utmSource || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.eventSource === 'SERVER_CAPI' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                            {ev.eventSource}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ev.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : ev.status === 'TEST' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 3 : CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire principal */}
          <div className="lg:col-span-2 bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-primary" />
                Paramètres du Pixel Meta & API Conversions
              </h3>
              <p className="text-xs text-gray-400">Configurez votre ID de Pixel et vos jetons d'accès API Meta</p>
            </div>

            {saveSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold flex items-center gap-3">
                <CheckCircle className="w-5 h-5 shrink-0" />
                {saveSuccess}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* ID Pixel Meta */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  ID du Pixel Meta (Facebook) *
                </label>
                <input
                  type="text"
                  required
                  value={configForm.pixelId}
                  onChange={(e) => setConfigForm({ ...configForm, pixelId: e.target.value })}
                  placeholder="ex: 3595484767284161"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-primary"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Identifiant unique fourni par votre Gestionnaire de Publicités Meta.
                </p>
              </div>

              {/* Token API Conversions (CAPI) */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  Jeton d'Accès API Conversions Meta (CAPI Token Optionnel)
                </label>
                <textarea
                  rows={3}
                  value={configForm.conversionsApiToken || ''}
                  onChange={(e) => setConfigForm({ ...configForm, conversionsApiToken: e.target.value })}
                  placeholder="EAA..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-brand-primary"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Permet le suivi côté serveur en contournant les bloqueurs de publicité (AdBlockers / iOS Safari).
                </p>
              </div>

              {/* Code d'Événement de Test Meta */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">
                  Code d'Événement de Test Meta (Optionnel pour Débogage)
                </label>
                <input
                  type="text"
                  value={configForm.testEventCode || ''}
                  onChange={(e) => setConfigForm({ ...configForm, testEventCode: e.target.value })}
                  placeholder="ex: TEST12345"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-primary"
                />
              </div>

              {/* Toggles d'activation */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <h4 className="text-xs font-bold text-gray-300 uppercase">Options de suivi</h4>

                <label className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition border border-white/5">
                  <span className="text-xs font-bold text-white">Activer le Pixel Meta Global</span>
                  <input
                    type="checkbox"
                    checked={configForm.isEnabled}
                    onChange={(e) => setConfigForm({ ...configForm, isEnabled: e.target.checked })}
                    className="w-5 h-5 accent-brand-primary rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition border border-white/5">
                  <span className="text-xs font-bold text-white">Activer l'API Conversions Serveur (CAPI)</span>
                  <input
                    type="checkbox"
                    checked={configForm.isCapiEnabled}
                    onChange={(e) => setConfigForm({ ...configForm, isCapiEnabled: e.target.checked })}
                    className="w-5 h-5 accent-brand-primary rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl cursor-pointer hover:bg-white/10 transition border border-white/5">
                  <span className="text-xs font-bold text-white">Suivre automatiquement les visites de page (PageView)</span>
                  <input
                    type="checkbox"
                    checked={configForm.trackPageViews}
                    onChange={(e) => setConfigForm({ ...configForm, trackPageViews: e.target.checked })}
                    className="w-5 h-5 accent-brand-primary rounded cursor-pointer"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-bold py-3.5 rounded-2xl transition shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 text-sm"
              >
                {savingConfig ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Enregistrer la Configuration'}
              </button>
            </form>
          </div>

          {/* Snippet Code & Instructions */}
          <div className="bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6 h-fit">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Copy className="w-5 h-5 text-blue-400" />
                Script Pixel Intégré
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Le script est déjà exécuté dynamiquement sur Bamousso RH. Voici le code source à des fins de vérification Meta.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-black/50 p-4 rounded-2xl text-[10px] text-emerald-400 font-mono overflow-x-auto border border-white/10 max-h-60">
                {codeSnippet}
              </pre>
              <button
                onClick={handleCopySnippet}
                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs flex items-center gap-1 font-semibold border border-white/10"
              >
                {copiedSnippet ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedSnippet ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENU ONGLET 4 : TEST D'ÉVÉNEMENT */}
      {activeTab === 'test' && (
        <div className="bg-[#1A0F0A] p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6 max-w-3xl mx-auto">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Outil de Test d'Événement Meta CAPI
            </h3>
            <p className="text-xs text-gray-400">
              Envoyez un événement de test en direct pour vérifier que votre Pixel et l'API Conversions reçoivent correctement les signaux.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">Nom de l'Événement</label>
              <select
                value={testEventName}
                onChange={(e) => setTestEventName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-primary"
              >
                <option value="PageView">PageView (Visite de page)</option>
                <option value="Lead">Lead (Prospect formulaire)</option>
                <option value="ProspectClick">ProspectClick (Clic redirection pub)</option>
                <option value="CompleteRegistration">CompleteRegistration (Inscription Entreprise)</option>
                <option value="Subscribe">Subscribe (Abonnement payé)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 uppercase">Code de Test Meta (Optionnel)</label>
              <input
                type="text"
                placeholder="ex: TEST98765"
                value={customTestCode}
                onChange={(e) => setCustomTestCode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-primary"
              />
            </div>

            <button
              onClick={handleSendTestEvent}
              disabled={sendingTest}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm"
            >
              {sendingTest ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Envoyer l'Événement de Test
            </button>

            {testResult && (
              <div className="mt-6 p-5 bg-black/60 rounded-2xl border border-white/10 space-y-3">
                <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Résultat du test Meta CAPI :</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${testResult.error ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {testResult.error ? 'Erreur' : 'Succès'}
                  </span>
                </div>

                <pre className="text-[11px] text-emerald-400 font-mono overflow-x-auto p-3 bg-black/40 rounded-xl max-h-60 border border-white/5">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
