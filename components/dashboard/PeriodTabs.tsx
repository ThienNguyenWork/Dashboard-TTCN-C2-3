
import React from 'react';
import type { ReportingPeriod } from '../../types';

interface PeriodTabsProps {
  activePeriod: ReportingPeriod;
  setActivePeriod: (period: ReportingPeriod) => void;
}

const periods: { id: ReportingPeriod; label: string }[] = [
  { id: 'mid_term_1', label: 'Giữa HK1' },
  { id: 'end_term_1', label: 'Cuối HK1' },
  { id: 'mid_term_2', label: 'Giữa HK2' },
  { id: 'end_year', label: 'Cuối năm' },
];

export const PeriodTabs: React.FC<PeriodTabsProps> = ({ activePeriod, setActivePeriod }) => {
  return (
    <div className="mb-4">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {periods.map((period) => (
            <button
              key={period.id}
              onClick={() => setActivePeriod(period.id)}
              className={`${
                activePeriod === period.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
            >
              {period.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
