
import React, { useState, useMemo } from 'react';
import { generateMockData } from '../../data/mockData';
import { SchoolClassPerformance } from './SchoolClassPerformance';
import { GradeEntryProgress } from './GradeEntryProgress';
import { StudentWatchlist } from './StudentWatchlist';
import { OverallStats } from './OverallStats';
import type { ReportingPeriod, Student, SchoolClass } from '../../types';
import { PeriodTabs } from './PeriodTabs';
import { DetailsModal } from './DetailsModal';

export type ModalDataType = {
    student: Student;
    class?: SchoolClass;
    reason: {
        type: 'subjects' | 'summary';
        content: string[] | string;
    }
}

export const GradebookDashboard: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<ReportingPeriod>('mid_term_1');
  const [modalContent, setModalContent] = useState<{ title: string; data: ModalDataType[] } | null>(null);

  const { students, classes, teachers, gradeEntryStatus } = useMemo(
    () => generateMockData(activePeriod),
    [activePeriod]
  );
  
  const handleCardClick = (title: string, data: ModalDataType[]) => {
      setModalContent({ title, data });
  };

  return (
    <div className="animate-fade-in space-y-6 px-6 pb-6">
        <PeriodTabs activePeriod={activePeriod} setActivePeriod={setActivePeriod} />
        <OverallStats students={students} classes={classes} period={activePeriod} onCardClick={handleCardClick} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg-col-span-2">
                 <SchoolClassPerformance students={students} classes={classes} teachers={teachers} />
            </div>
            <div className="lg-col-span-1">
                <GradeEntryProgress gradeEntryStatus={gradeEntryStatus} />
            </div>
        </div>
        <StudentWatchlist students={students} classes={classes} period={activePeriod} />
        
        {modalContent && (
            <DetailsModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent.title}
                data={modalContent.data}
                classes={classes}
            />
        )}
    </div>
  );
};
