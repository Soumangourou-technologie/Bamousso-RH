export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type PlanType = 'FITINI' | 'LOUBA' | 'KORO';

export interface PlanDetails {
  id: PlanType;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxBase: number; // Use Infinity for unlimited
  description: string;
}

export const EXTRA_EMPLOYEE_COST_MONTHLY = 850;

export const PRICING_PLANS: Record<PlanType, PlanDetails> = {
  FITINI: {
    id: 'FITINI',
    name: 'FITINI',
    priceMonthly: 4500,
    priceYearly: 54000,
    maxBase: 5,
    description: 'Idéal pour les petites équipes'
  },
  LOUBA: {
    id: 'LOUBA',
    name: 'LOUBA',
    priceMonthly: 8350,
    priceYearly: 100200,
    maxBase: 10,
    description: 'Parfait pour les PME en croissance'
  },
  KORO: {
    id: 'KORO',
    name: 'Kôrô',
    priceMonthly: 14700,
    priceYearly: 176400,
    maxBase: Infinity,
    description: 'La solution complète sans limite'
  }
};

export const calculateTotalAmount = (
  plan: PlanType,
  billingCycle: BillingCycle,
  extraEmployees: number = 0
): number => {
  const planDetails = PRICING_PLANS[plan];
  if (!planDetails) return 0;

  let basePrice = billingCycle === 'YEARLY' ? planDetails.priceYearly : planDetails.priceMonthly;
  
  // Les employés supplémentaires ne s'appliquent pas à KORO (illimité)
  if (plan === 'KORO' || extraEmployees <= 0) {
    return basePrice;
  }

  const multiplier = billingCycle === 'YEARLY' ? 12 : 1;
  const extraCost = extraEmployees * EXTRA_EMPLOYEE_COST_MONTHLY * multiplier;

  return basePrice + extraCost;
};

export const calculateExtraEmployeesCost = (
  plan: PlanType,
  billingCycle: BillingCycle,
  extraEmployees: number = 0
): number => {
  if (plan === 'KORO' || extraEmployees <= 0) {
    return 0;
  }
  const multiplier = billingCycle === 'YEARLY' ? 12 : 1;
  return extraEmployees * EXTRA_EMPLOYEE_COST_MONTHLY * multiplier;
};
