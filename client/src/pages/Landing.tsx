import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, Building2, Check, Clock3, GraduationCap, MessageCircle, Store, UsersRound } from 'lucide-react';
import { EXTRA_EMPLOYEE_COST_MONTHLY, PRICING_PLANS, type BillingCycle, type PlanType } from '@shared/pricing';
import api from '../utils/api';
import { trackMetaEvent } from '../utils/metaPixel';
import './Landing.css';

const areas = [
  {
    name: 'Bamousso RH', title: 'Gérer votre entreprise', icon: UsersRound, tone: 'green', target: '/register/entreprise',
    description: 'Suivez les présences, les congés, les tâches et l’activité de vos équipes dans un même espace.',
    action: 'Créer mon espace RH',
  },
  {
    name: 'Annuaire Pro', title: 'Trouver des fournisseurs', icon: Store, tone: 'orange', target: '/annuaire-pro',
    description: 'Recherchez un fournisseur, consultez son catalogue et demandez un devis ou passez commande.',
    action: 'Explorer l’annuaire',
  },
  {
    name: 'Bamousso Académie', title: 'Développer vos compétences', icon: GraduationCap, tone: 'blue', target: '/academie',
    description: 'Suivez une formation à votre rythme ou inscrivez vos collaborateurs et suivez leur progression.',
    action: 'Voir les formations',
  },
];

const plans = [
  { id: 'FITINI', features: ['Pointage en temps réel', 'Gestion des congés et des tâches', 'Support par ticket'] },
  { id: 'LOUBA', features: ['Analytique RH avancée', 'Messagerie interne', 'Gestion des salaires et des conflits'] },
  { id: 'KORO', features: ['Toutes les fonctionnalités RH', 'Support VIP', 'Accompagnement dédié'] },
] satisfies { id: PlanType; features: string[] }[];

const tutorials = [
  { id: '_9RB5Dp9qR4', title: 'Créer un compte collaborateur' },
  { id: 'eY4lkXjIKNs', title: 'Pointer son arrivée' },
  { id: 'hCf7WPoeRKY', title: 'Attribuer une tâche' },
];

const questions = [
  {
    title: 'À qui s’adresse Bamousso RH ?',
    answer: 'Aux entreprises qui souhaitent suivre les présences, les congés et le travail de leurs équipes, au bureau comme sur le terrain. Les abonnements RH sont affichés en FCFA.',
  },
  {
    title: 'Comment prendre contact avec un fournisseur ?',
    answer: 'Recherchez un fournisseur dans l’Annuaire Pro, puis ouvrez sa fiche. Selon l’article, vous pouvez passer une commande ou demander un devis depuis votre compte entreprise.',
  },
  {
    title: 'Comment obtenir une attestation de formation ?',
    answer: 'Inscrivez-vous à une formation avec votre compte Bamousso, terminez ses leçons et réussissez le quiz final. Vous pourrez ensuite télécharger votre attestation nominative.',
  },
  {
    title: 'Puis-je inscrire mon équipe à une formation ?',
    answer: 'Oui. Depuis l’Académie, un administrateur d’entreprise peut ouvrir « Former mon équipe », inscrire ses collaborateurs et suivre leur progression.',
  },
];

const contactFallback = '2250706045256';
const number = new Intl.NumberFormat('fr-CI');

function DashboardIllustration() {
  return (
    <div className="bmh-illustration" aria-hidden="true">
      <div className="bmh-illustration-grid" />
      <div className="bmh-demo">
        <div className="bmh-demo-top"><span><i /><i /><i /></span><span>APERÇU DU TABLEAU DE BORD</span></div>
        <div className="bmh-demo-body">
          <div className="bmh-demo-side">
            <span className="bmh-demo-logo"><Building2 size={16} /></span>
            <span className="bmh-demo-icon"><UsersRound size={17} /></span>
            <Clock3 size={17} />
            <Store size={17} />
            <BookOpen size={17} />
          </div>
          <div className="bmh-demo-content">
            <div className="bmh-demo-title"><div><small>RESSOURCES HUMAINES</small><strong>Vue d’ensemble</strong></div><span>Cette semaine</span></div>
            <div className="bmh-demo-stats">
              <div><small>Équipe</small><strong>24</strong><span>collaborateurs</span></div>
              <div><small>Présences</small><strong>96 %</strong><span>cette semaine</span></div>
            </div>
            <div className="bmh-demo-chart">
              <span>Activité de l’équipe</span>
              <div className="bmh-demo-bars">
                <i /><i /><i /><i /><i /><i /><i />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bmh-demo-note"><span><Check size={17} /></span><div><strong>Pointage enregistré</strong><small>Exemple de suivi d’équipe</small></div></div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [contacts, setContacts] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    api.get<{ contacts?: string[] }>('/settings/public').then(({ data }) => {
      if (active) setContacts([...new Set((data.contacts ?? []).map(contact => contact.replace(/\D/g, '')).filter(Boolean))]);
    }).catch(() => { /* Le contact de secours reste disponible. */ });
    return () => { active = false; };
  }, []);

  const whatsapp = contacts.length ? contacts : [contactFallback];
  function selectPlan(planId: PlanType) {
    trackMetaEvent('InitiateCheckout', { planId, billingCycle });
    navigate('/register/entreprise', { state: { selectedPlanId: planId, billingCycle } });
  }

  return (
    <div className="bmh">
      <a className="bmh-skip" href="#contenu">Aller au contenu</a>
      <header className="bmh-header">
        <div className="bmh-shell bmh-nav">
          <Link className="bmh-brand" to="/" aria-label="Bamousso, accueil"><span><Building2 size={20} /></span>Bamousso<span className="bmh-brand-dot">.</span></Link>
          <nav className="bmh-nav-links" aria-label="Navigation principale">
            <a href="#features">Les solutions</a>
            <a href="#pricing">Tarifs RH</a>
            <Link to="/emploi">Offres d’emploi</Link>
            <a href="#faq">Questions fréquentes</a>
          </nav>
          <Link className="bmh-button bmh-button-outline" to="/login">Se connecter <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </header>

      <main id="contenu">
        <section className="bmh-shell bmh-hero" aria-labelledby="bmh-title">
          <div>
            <p className="bmh-kicker"><i /> Conçu en Côte d’Ivoire</p>
            <h1 id="bmh-title">Gérez votre entreprise.<br /><em>Développez votre activité.</em></h1>
            <p className="bmh-hero-text">Organisez le travail de vos équipes, trouvez des fournisseurs et développez vos compétences avec Bamousso.</p>
            <div className="bmh-actions">
              <Link className="bmh-button bmh-button-primary" to="/register">Créer un compte <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className="bmh-button bmh-button-outline" href="#features">Voir les solutions</a>
            </div>
          </div>
          <DashboardIllustration />
        </section>

        <section className="bmh-shell bmh-section bmh-solutions" id="features" aria-labelledby="bmh-solutions-title">
          <p className="bmh-kicker"><i /> Les solutions Bamousso</p>
          <h2 id="bmh-solutions-title">Que souhaitez-vous faire ?</h2>
          <div className="bmh-tiles">
            {areas.map(({ name, title, icon: Icon, tone, target, description, action }) => (
              <article className={`bmh-tile bmh-tile-${tone}`} key={name}>
                <span className="bmh-tile-icon"><Icon size={23} aria-hidden="true" /></span>
                <p className="bmh-tile-name">{name}</p>
                <h3>{title}</h3>
                <p>{description}</p>
                <Link to={target}>{action}<ArrowUpRight size={17} aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="bmh-band" id="pricing" aria-labelledby="bmh-pricing-title">
          <div className="bmh-shell bmh-section">
            <div className="bmh-section-heading">
              <div><p className="bmh-kicker"><i /> Abonnements RH</p><h2 id="bmh-pricing-title">Une formule pour votre équipe</h2></div>
              <div className="bmh-switch" role="group" aria-label="Période de facturation">
                <button type="button" aria-pressed={billingCycle === 'MONTHLY'} onClick={() => setBillingCycle('MONTHLY')}>Mensuel</button>
                <button type="button" aria-pressed={billingCycle === 'YEARLY'} onClick={() => setBillingCycle('YEARLY')}>Annuel</button>
              </div>
            </div>
            <div className="bmh-tiles" aria-live="polite">
              {plans.map(({ id, features }) => {
                const plan = PRICING_PLANS[id];
                const yearly = billingCycle === 'YEARLY';
                return (
                  <article className={`bmh-tile bmh-price ${id === 'LOUBA' ? 'bmh-price-accent' : ''}`} key={id}>
                    <h3>{plan.name}</h3>
                    <p>{plan.description}</p>
                    <p className="bmh-price-amount"><strong>{number.format(yearly ? plan.priceYearly : plan.priceMonthly)}</strong> FCFA / {yearly ? 'an' : 'mois'}</p>
                    <ul>
                      {[Number.isFinite(plan.maxBase) ? `Jusqu’à ${plan.maxBase} collaborateurs inclus` : 'Nombre de collaborateurs illimité', ...features,
                        ...(Number.isFinite(plan.maxBase) ? [`${number.format(EXTRA_EMPLOYEE_COST_MONTHLY)} FCFA par mois et par collaborateur supplémentaire`] : []),
                      ].map(feature => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}
                    </ul>
                    <button className="bmh-button bmh-button-primary" type="button" onClick={() => selectPlan(id)}>Choisir {plan.name} <ArrowRight size={16} aria-hidden="true" /></button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bmh-shell bmh-section bmh-resources" id="faq" aria-labelledby="bmh-faq-title">
          <div id="tutorials">
            <p className="bmh-kicker"><i /> Prise en main</p>
            <h2>Les premiers gestes en vidéo</h2>
            <ul>{tutorials.map(video => <li key={video.id}><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer"><BookOpen size={17} aria-hidden="true" />{video.title}<ArrowUpRight size={16} aria-hidden="true" /></a></li>)}</ul>
          </div>
          <div>
            <p className="bmh-kicker"><i /> Aide</p>
            <h2 id="bmh-faq-title">Questions fréquentes</h2>
            {questions.map(({ title, answer }) => <details key={title}><summary>{title}</summary><p>{answer}</p></details>)}
          </div>
        </section>

        <section className="bmh-shell bmh-contact" id="contact" aria-labelledby="bmh-contact-title">
          <div><p className="bmh-kicker"><i /> Contact</p><h2 id="bmh-contact-title">Parlons de vos besoins</h2><p>Une question sur votre abonnement RH ou son paiement ? Écrivez-nous sur WhatsApp.</p></div>
          <div className="bmh-actions">{whatsapp.map((phone, index) => (
            <a key={phone} className="bmh-button bmh-button-primary" href={`https://wa.me/${phone}?text=${encodeURIComponent('Bonjour, je souhaite en savoir plus sur Bamousso RH.')}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} aria-hidden="true" />{whatsapp.length === 1 ? 'Écrire sur WhatsApp' : `Contact WhatsApp ${index + 1}`}
            </a>
          ))}</div>
        </section>
      </main>

      <footer className="bmh-footer"><div className="bmh-shell">
        <p><strong>Bamousso</strong> · Soumangourou Technologies</p>
        <p>© {new Date().getFullYear()} · Côte d’Ivoire</p>
      </div></footer>
    </div>
  );
}
