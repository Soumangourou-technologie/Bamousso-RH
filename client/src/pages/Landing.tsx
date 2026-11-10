import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Building2, GraduationCap, MessageCircle, Store } from 'lucide-react';
import api from '../utils/api';
import './Landing.css';

const audiences = [
  {
    title: 'Particulier', image: '/bamousso/particulier.webp', path: '/register/personnel',
    description: 'Trouvez un emploi, déposez votre CV et suivez des formations à votre rythme.',
    action: 'Créer un compte personnel',
  },
  {
    title: 'Entreprise', image: '/bamousso/entreprise.webp', path: '/register/entreprise',
    description: 'Gérez vos équipes, recrutez et trouvez des fournisseurs pour votre activité.',
    action: 'Créer un compte entreprise',
  },
];

const shortcuts = [
  { title: 'Offres d’emploi', icon: BriefcaseBusiness, path: '/emploi' },
  { title: 'Annuaire Pro', icon: Store, path: '/annuaire-pro' },
  { title: 'Formations', icon: GraduationCap, path: '/academie' },
];

const tutorials = [
  { id: '_9RB5Dp9qR4', title: 'Créer un compte collaborateur' },
  { id: 'eY4lkXjIKNs', title: 'Pointer son arrivée' },
  { id: 'hCf7WPoeRKY', title: 'Attribuer une tâche' },
];

const questions = [
  {
    title: 'À qui s’adresse Bamousso RH ?',
    answer: 'Aux entreprises qui souhaitent suivre les présences, les congés et le travail de leurs équipes, au bureau comme sur le terrain.',
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

export default function Landing() {
  const [contacts, setContacts] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    api.get<{ contacts?: string[] }>('/settings/public').then(({ data }) => {
      if (active) setContacts([...new Set((data.contacts ?? []).map(contact => contact.replace(/\D/g, '')).filter(Boolean))]);
    }).catch(() => { /* Le contact de secours reste disponible. */ });
    return () => { active = false; };
  }, []);

  const whatsapp = contacts.length ? contacts : [contactFallback];
  return (
    <div className="bmh">
      <a className="bmh-skip" href="#contenu">Aller au contenu</a>
      <header className="bmh-header">
        <div className="bmh-shell bmh-nav">
          <Link className="bmh-brand" to="/" aria-label="Bamousso, accueil"><span><Building2 size={20} /></span>Bamousso<span className="bmh-brand-dot">.</span></Link>
          <nav className="bmh-nav-links" aria-label="Navigation principale">
            <a href="#features">Explorer</a>
            <a href="#faq">Aide</a>
          </nav>
          <Link className="bmh-button bmh-button-outline" to="/login">Se connecter <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </header>

      <main id="contenu">
        <section className="bmh-shell bmh-hero" aria-labelledby="bmh-title">
          <p className="bmh-kicker"><i /> Conçu en Côte d’Ivoire</p>
          <h1 id="bmh-title">Un espace pour travailler<br className="bmh-desktop-break" /> et se développer</h1>
          <p className="bmh-hero-text">Emploi et formations pour les particuliers. Gestion RH, recrutement et annuaire pour les entreprises.</p>
          <div className="bmh-audiences">
            {audiences.map(({ title, image, path, description, action }) => (
              <article className="bmh-audience" key={path}>
                <img className="bmh-audience-photo" src={image} alt="" width={960} height={640} decoding="async" />
                <div className="bmh-audience-content">
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <Link className="bmh-button bmh-button-primary" to={path}>{action}<ArrowRight size={16} aria-hidden="true" /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bmh-shell bmh-explore" id="features" aria-labelledby="bmh-explore-title">
          <h2 id="bmh-explore-title">Explorer Bamousso</h2>
          <ul className="bmh-shortcuts">
            {shortcuts.map(({ title, icon: Icon, path }) => (
              <li key={path}><Link to={path}><Icon size={19} aria-hidden="true" />{title}<ArrowUpRight size={16} aria-hidden="true" /></Link></li>
            ))}
          </ul>
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
