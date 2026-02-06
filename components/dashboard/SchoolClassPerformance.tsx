import React, { useMemo } from 'react';
import type { Student, SchoolClass, Teacher } from '../../types';
import { WarningIcon } from '../Icons';

interface SchoolClassPerformanceProps {
  students: Student[];
  classes: SchoolClass[];
  teachers: Teacher[];
}

const ClassPerformanceBar: React.FC<{ good: number; ok: number; bad: number; total: number }> = ({ good, ok, bad, total }) => {
    const goodPercent = (good / total) * 100;
    const okPercent = (ok / total) * 100;
    const badPercent = (bad / total) * 100;

    return (
        <div className="w-full flex h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mt-2">
            <div style={{ width: `${goodPercent}%` }} className="bg-green-500" title={`Hoàn thành tốt/XS: ${good} HS`}></div>
            <div style={{ width: `${okPercent}%` }} className="bg-blue-500" title={`Hoàn thành: ${ok} HS`}></div>
            <div style={{ width: `${badPercent}%` }} className="bg-red-500" title={`Chưa hoàn thành: ${bad} HS`}></div>
        </div>
    );
}


export const SchoolClassPerformance: React.FC<SchoolClassPerformanceProps> = ({ students, classes, teachers }) => {
    const classStats = useMemo(() => {
        return classes.map(cls => {
            const classStudents = students.filter(s => s.classId === cls.id);
            const total = classStudents.length;
            if(total === 0) return null;

            const good = classStudents.filter(s => s.overallAssessment === 'Hoàn thành tốt' || s.overallAssessment === 'Hoàn thành xuất sắc').length;
            const ok = classStudents.filter(s => s.overallAssessment === 'Hoàn thành').length;
            const bad = classStudents.filter(s => s.overallAssessment === 'Chưa hoàn thành').length;
            
            const teacher = teachers.find(t => t.id === cls.teacherId);

            return {
                ...cls,
                teacherName: teacher?.name || 'N/A',
                totalStudents: total,
                stats: { good, ok, bad },
                warning: (bad / total) > 0.1, // Warning if > 10% need attention
            };
        }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [students, classes, teachers]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-full">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Tình hình các lớp học</h3>
            <div className="space-y-4">
                {classStats.map(cls => (
                    <div key={cls.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white">{cls.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">GVCN: {cls.teacherName} - Sĩ số: {cls.totalStudents}</p>
                            </div>
                            {cls.warning && (
                                <div title="Lớp có nhiều học sinh cần hỗ trợ">
                                    <WarningIcon className="h-6 w-6 text-red-500" />
                                </div>
                            )}
                        </div>
                        <ClassPerformanceBar good={cls.stats.good} ok={cls.stats.ok} bad={cls.stats.bad} total={cls.totalStudents} />
                    </div>
                ))}
            </div>
        </div>
    );
};