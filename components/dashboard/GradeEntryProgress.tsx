
import React from 'react';
import type { GradeEntryStatus } from '../../types';

export const GradeEntryProgress: React.FC<{ gradeEntryStatus: GradeEntryStatus[] }> = ({ gradeEntryStatus }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-full">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Tiến độ nhập điểm</h3>
      <div className="space-y-3">
        {gradeEntryStatus.map(subjectStatus => {
          const percentage = subjectStatus.total > 0 ? (subjectStatus.entered / subjectStatus.total) * 100 : 0;
          let barColor = 'bg-green-500';
          if (percentage < 90) barColor = 'bg-yellow-500';
          if (percentage < 70) barColor = 'bg-red-500';

          return (
            <div key={subjectStatus.subject}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{subjectStatus.subject}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{Math.round(percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
