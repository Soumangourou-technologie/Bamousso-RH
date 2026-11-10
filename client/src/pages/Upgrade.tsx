import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, CheckCircle, ShieldAlert, Sparkles, Star, Award, Zap, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { PricingToggle } from '../components/PricingToggle';
import { BillingCycle, PlanType, PRICING_PLANS, EXTRA_EMPLOYEE_COST_MONTHLY } from '@shared/pricing';

const AVAILABLE_PLANS = [
  { 
    id: 'FITINI', 
    name: PRICING_PLANS.FITINI.name, 
    maxBase: PRICING_PLANS.FITINI.maxBase, 
    description: PRICING_PLANS.FITINI.description,
    icon: Zap,
    color: 'text-brand-primary',
    bg: 'bg-brand-primary/10',
    border: 'border-brand-primary/20',
    features: [
      "Jusqu'à 5 employés inclus",
      "Pointage & Gestion des Congés",
      "Gestion de la Paie simplifiée",
      "Support client prioritaire"
    ]
  },
  { 
    id: 'LOUBA', 
    name: PRICING_PLANS.LOUBA.name, 
    maxBase: PRICING_PLANS.LOUBA.maxBase, 
    description: PRICING_PLANS.LOUBA.description,
    icon: Star,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-800/40',
    features: [
      "Jusqu'à 10 employés inclus",
      "Messagerie & Chat d'équipe sécurisé",
      "Gestion avancée des Salaires",
      "Gestion et Résolution des Conflits",
      "Support client prioritaire",
      "Pointage et Congés inclus"
    ]
  },
  { 
    id: 'KORO', 
    name: PRICING_PLANS.KORO.name, 
    maxBase: PRICING_PLANS.KORO.maxBase, 
    description: PRICING_PLANS.KORO.description,
    icon: Award,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-800/40',
    features: [
      "Employés illimités",
      "Messagerie & Chat d'équipe sécurisé",
      "Module d'Analyse RH & Graphiques",
      "Toutes les fonctionnalités débloquées",
      "Support Direct Instantané 24h/7j",
      "Performance applicative maximale"
    ]
  }
];

const UpgradePlan = () => {
  const { company } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPlan = company?.plan || 'FITINI';
  const currentExtraEmployees = company?.extraEmployees || 0;

  // Déterminer le plan initialement sélectionné
  const initialSelectedPlan = location.state?.selectedPlanId || currentPlan;

  const [selectedPlan, setSelectedPlan] = useState<PlanType>(initialSelectedPlan as PlanType);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>((company as any)?.billingCycle || 'MONTHLY');
  const [extraEmployees, setExtraEmployees] = useState<number>(currentExtraEmployees);

  const isSamePlan = selectedPlan === currentPlan;
  const isSubscriptionActive = company?.subscriptionStatus === 'ACTIVE';

  // Mode de paiement : si même plan + abonnement actif, l'admin peut payer uniquement les employés supplémentaires (ADD_ON)
  const [actionType, setActionType] = useState<'ADD_ON' | 'FULL'>('ADD_ON');

  const isAddOnMode = isSamePlan && isSubscriptionActive && actionType === 'ADD_ON';

  // Coût unitaire des employés
  const extraUnitCost = billingCycle === 'YEARLY' ? EXTRA_EMPLOYEE_COST_MONTHLY * 12 : EXTRA_EMPLOYEE_COST_MONTHLY;
  const extraCost = selectedPlan === 'KORO' ? 0 : extraEmployees * extraUnitCost;

  // Coût du plan principal (0 FCFA si simple ajout d'option sur abonnement actif)
  const planBaseCost = isAddOnMode ? 0 : (
    billingCycle === 'YEARLY' 
      ? (PRICING_PLANS[selectedPlan]?.priceYearly || 0)
      : (PRICING_PLANS[selectedPlan]?.priceMonthly || 0)
  );

  // Toutes les formules sont éligibles pour renouvellement ou upgrade
  const eligiblePlans = AVAILABLE_PLANS;
  const selectedPlanDetails = AVAILABLE_PLANS.find(p => p.id === selectedPlan) || eligiblePlans[0];

  // Calculer le montant final
  const calculateTotal = () => {
    return planBaseCost + extraCost;
  };

  const handleProceedToPayment = () => {
    if (!selectedPlanDetails) return;

    navigate('/payment', {
      state: {
        plan: {
          id: selectedPlanDetails.id,
          name: isAddOnMode ? `${selectedPlanDetails.name} (+${extraEmployees} employé(s))` : selectedPlanDetails.name,
          finalPrice: calculateTotal(),
        },
        billingCycle,
        extraEmployees: selectedPlanDetails.id === 'KORO' ? 0 : extraEmployees,
        companyName: company?.name || "Votre entreprise",
        companyId: company?.id,
        isAddOn: isAddOnMode
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      {/* En-tête Premium */}
      <div className="text-center space-y-3 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm relative z-10">
          <Sparkles className="w-4 h-4 animate-pulse" /> Gestion des Abonnements
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter relative z-10">
          Renouvelez ou faites évoluer <span className="bg-linear-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">{company?.name}</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-2xl mx-auto font-medium relative z-10">
          Renouvelez votre formule actuelle ou débloquez un niveau supérieur pour accompagner la croissance de votre entreprise.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panneau de gauche : Sélection des formules éligibles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-primary" /> Formules Disponibles
                </h3>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">
                  Actuelle : <span className="text-brand-primary font-black">{currentPlan}</span>
                </span>
              </div>
              <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eligiblePlans.length === 0 ? (
                <div className="col-span-2 p-8 bg-gray-50 dark:bg-gray-900 rounded-3xl text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                  <ShieldAlert className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Aucune mise à niveau disponible pour votre offre actuelle.</p>
                </div>
              ) : (
                eligiblePlans.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.id;

                  return (
                    <motion.div
                      whileHover={{ y: -4 }}
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id as PlanType)}
                      className={`cursor-pointer group relative flex flex-col bg-white dark:bg-gray-800 p-6 rounded-3xl border-2 shadow-sm transition-all duration-300 ${
                        isSelected 
                          ? 'border-brand-primary bg-brand-primary/1 shadow-lg ring-4 ring-brand-primary/5' 
                          : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {/* Badge séléctionné */}
                      {isSelected && (
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-brand-primary rounded-full border-4 border-white dark:border-gray-800 shadow flex items-center justify-center text-white">
                          <CheckCircle className="w-4 h-4 fill-current" />
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-2xl ${plan.bg} ${plan.color} flex items-center justify-center shadow-inner`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-xl text-gray-900 dark:text-white">{plan.name}</h4>
                            {plan.id === currentPlan ? (
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                Renouvellement
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-wider text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">
                                Upgrade
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-6 font-medium min-h-10">
                        {plan.description}
                      </p>

                      <hr className="border-gray-100 dark:border-gray-700/50 mb-5" />

                      <ul className="space-y-3 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Curseur ou input d'employés supplémentaires (non applicable pour Kôrô car illimité) */}
            {selectedPlanDetails && selectedPlanDetails.id !== 'KORO' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Employés supplémentaires requis ?
                  </h4>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/60 px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-inner shrink-0">
                  <button 
                    onClick={() => setExtraEmployees(Math.max(0, extraEmployees - 1))}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-black shadow hover:bg-gray-50 transition-all"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    min="0"
                    value={extraEmployees}
                    onChange={(e) => setExtraEmployees(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center bg-transparent border-none font-black text-gray-900 dark:text-white text-base focus:ring-0"
                  />
                  <button 
                    onClick={() => setExtraEmployees(extraEmployees + 1)}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-black shadow hover:bg-gray-50 transition-all"
                  >
                    +
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Panneau de droite : Récapitulatif de Commande */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Récapitulatif
            </h3>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xl relative overflow-hidden flex flex-col h-full">
              {/* Background Blur Deco */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10 flex-1">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Entreprise</span>
                  <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" /> {company?.name || 'Mon Entreprise'}
                  </p>
                </div>

                <hr className="border-gray-100 dark:border-gray-700/50" />

                {/* Choix d'action pour le même plan actif */}
                {isSamePlan && isSubscriptionActive && (
                  <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/20 space-y-2">
                    <span className="text-[10px] font-black uppercase text-brand-primary tracking-wider">Option de facturation</span>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 dark:text-gray-200">
                        <input 
                          type="radio" 
                          name="actionType" 
                          checked={actionType === 'ADD_ON'} 
                          onChange={() => setActionType('ADD_ON')}
                          className="accent-brand-primary"
                        />
                        <span>Ajouter uniquement les employés (+{extraEmployees})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 dark:text-gray-200">
                        <input 
                          type="radio" 
                          name="actionType" 
                          checked={actionType === 'FULL'} 
                          onChange={() => setActionType('FULL')}
                          className="accent-brand-primary"
                        />
                        <span>Renouveler la formule complète (+30 jours)</span>
                      </label>
                    </div>
                  </div>
                )}

                {selectedPlanDetails ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          {isAddOnMode ? "Formule Actuelle" : "Nouvelle Formule"}
                        </span>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{selectedPlanDetails.name}</p>
                      </div>
                    </div>

                    {selectedPlanDetails.id !== 'KORO' && extraEmployees > 0 && (
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Quota Additionnel</span>
                          <p className="text-xs font-bold text-orange-500">+ {extraEmployees} employé(s)</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col space-y-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Capacité Finale</span>
                      <span className="font-black text-sm text-gray-900 dark:text-white">
                        {selectedPlanDetails.id === 'KORO' ? "Illimité" : `${(selectedPlanDetails.maxBase || 0) + extraEmployees} employés`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-medium italic">Veuillez sélectionner une offre à gauche.</p>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 relative z-10 space-y-6">
                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedPlanDetails}
                  className="w-full bg-linear-to-r from-brand-primary to-brand-accent text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/25 hover:shadow-brand-primary/45 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Continuer vers le paiement <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[10px] text-center text-gray-400 font-medium">
                  Le paiement est traité via GeniusPay. Votre offre et sa durée de 30 jours seront appliquées immédiatement après validation.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default UpgradePlan;
