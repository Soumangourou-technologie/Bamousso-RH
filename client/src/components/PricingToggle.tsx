import React from 'react';
import { BillingCycle } from '@shared/pricing';

interface PricingToggleProps {
  billingCycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

export const PricingToggle: React.FC<PricingToggleProps> = ({ billingCycle, onChange }) => {
  return (
    <div className="flex justify-center items-center my-8">
      <div className="relative flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          onClick={() => onChange('MONTHLY')}
          className={`relative z-10 flex-1 px-6 py-2.5 text-sm font-semibold transition-colors duration-300 rounded-full ${
            billingCycle === 'MONTHLY' 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Mensuel
        </button>
        <button
          onClick={() => onChange('YEARLY')}
          className={`relative z-10 flex-1 px-6 py-2.5 text-sm font-semibold transition-colors duration-300 rounded-full flex items-center gap-2 ${
            billingCycle === 'YEARLY' 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Annuel
        </button>

        {/* Animated Background Indicator */}
        <div 
          className="absolute top-1 bottom-1 left-1 bg-white dark:bg-gray-700 rounded-full shadow-md transition-transform duration-300 ease-in-out"
          style={{
            width: 'calc(50% - 4px)',
            transform: billingCycle === 'YEARLY' ? 'translateX(100%)' : 'translateX(0)'
          }}
        />
      </div>
    </div>
  );
};
