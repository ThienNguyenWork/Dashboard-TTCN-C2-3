
import React, { useMemo } from 'react';
import type { Student, SchoolClass, ReportingPeriod } from '../../types';
import { StarIcon, WarningIcon } from '../Icons';

interface StudentWatchlistProps {
  students: Student[];
  classes: SchoolClass[];
  period: ReportingPeriod;
}

const StudentListItem: React.FC<{ student: Student, class: SchoolClass | undefined, reason?: string, icon: React.ReactNode }> = ({ student, class: studentClass, reason, icon }) => (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
        <div className="flex items-center">
            <span className="mr-3">{icon}</span>
            <div>
                <p className="font-semibold text-gray-800 dark:text-white">{student.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{studentClass?.name || 'N/A'}</p>
            </div>
        </div>
        {reason && <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-full">{reason}</span>}
    </div>
);


export const StudentWatchlist: React.FC<StudentWatchlistProps> = ({ students, classes, period }) => {
  const isEndTerm = period === 'end_term_1' || period === 'end_year';

  const topPerformers = useMemo(() => {
    if (!isEndTerm) return [];
    return students
      .filter(s => s.overallAssessment === 'Hoàn thành xuất sắc')
      .slice(0, 5);
  }, [students, isEndTerm]);

  const needsAttention = useMemo(() => {
    return students
      .map(s => {
        const unfinishedSubjects = s.assessments
          .filter(a => a.level === 'Chưa hoàn thành')
          .map(a => a.subject);
        return { student: s, reason: unfinishedSubjects.join(', ') };
      })
      .filter(item => item.reason)
      .slice(0, 5);
  }, [students]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {isEndTerm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Học sinh nổi bật (Khen thưởng)</h3>
          <div className="space-y-2">
              {topPerformers.length > 0 ? topPerformers.map(student => (
                  <StudentListItem
                      key={student.id}
                      student={student}
                      class={classes.find(c => c.id === student.classId)}
                      icon={<StarIcon className="h-5 w-5 text-yellow-400"/>}
                  />
              )) : <p className="text-sm text-gray-500 dark:text-gray-400">Không có học sinh đạt mức xuất sắc.</p>}
          </div>
        </div>
      )}
      <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg ${!isEndTerm ? 'md:col-span-2' : ''}`}>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Học sinh cần hỗ trợ</h3>
        <div className="space-y-2">
            {needsAttention.length > 0 ? needsAttention.map(({ student, reason }) => (
                 <StudentListItem
                    key={student.id}
                    student={student}
                    class={classes.find(c => c.id === student.classId)}
                    icon={<WarningIcon className="h-5 w-5 text-red-500"/>}
                    reason={reason}
                />
            )) : <p className="text-sm text-gray-500 dark:text-gray-400">Không có học sinh nào cần hỗ trợ đặc biệt.</p>}
        </div>
      </div>
    </div>
  );
};
