
import React from 'react';
import type { Student, ReportingPeriod, SchoolClass } from '../../types';
import { UsersIcon, TrendingUpIcon, TrendingDownIcon, CheckCircleIcon, WarningIcon, ClipboardListIcon, InformationCircleIcon } from '../Icons';
import type { ModalDataType } from './GradebookDashboard';

interface OverallStatsProps {
  students: Student[];
  classes: SchoolClass[];
  period: ReportingPeriod;
  onCardClick: (title: string, data: ModalDataType[]) => void;
}

const StatCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    subValue?: string; 
    color: string; 
    tooltip: string;
    onClick?: () => void;
}> = ({ icon, title, value, subValue, color, tooltip, onClick }) => {
    const cardContent = (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center h-full">
            <div className={`p-3 rounded-full mr-4 ${color}`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                    <div className="group relative ml-1.5">
                         <InformationCircleIcon className="h-4 w-4 text-gray-400 dark:text-gray-500"/>
                         <span className="absolute bottom-full mb-2 w-64 p-2 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none left-1/2 -translate-x-1/2 z-10">
                            {tooltip}
                         </span>
                    </div>
                </div>
                <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
                {subValue && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subValue}</p>}
            </div>
        </div>
    );
    
    if(onClick) {
        return (
            <button onClick={onClick} className="text-left w-full h-full transition-transform transform hover:scale-105">
                {cardContent}
            </button>
        )
    }

    return cardContent;
}

const getUnfinishedSubjects = (student: Student): string[] => {
    return student.assessments
        .filter(a => a.level === 'Chưa hoàn thành')
        .map(a => a.subject);
};

export const OverallStats: React.FC<OverallStatsProps> = ({ students, classes, period, onCardClick }) => {
    const totalStudents = students.length;
    const isEndTerm = period === 'end_term_1' || period === 'end_year';

    let stats;
    if (isEndTerm) {
        const excellent = students.filter(s => s.overallAssessment === 'Hoàn thành xuất sắc');
        const good = students.filter(s => s.overallAssessment === 'Hoàn thành tốt');
        const needsAttention = students.filter(s => s.overallAssessment === 'Chưa hoàn thành');
        stats = (
            <>
                <StatCard 
                    icon={<TrendingUpIcon className="h-6 w-6 text-white"/>}
                    title="HS Hoàn thành Xuất sắc"
                    value={`${excellent.length} (${totalStudents > 0 ? ((excellent.length / totalStudents) * 100).toFixed(1) : 0}%)`}
                    color="bg-green-500"
                    tooltip="Học sinh được đánh giá 'Hoàn thành xuất sắc' vào cuối kỳ/cuối năm."
                />
                 <StatCard 
                    icon={<CheckCircleIcon className="h-6 w-6 text-white"/>}
                    title="HS Hoàn thành Tốt"
                    value={`${good.length} (${totalStudents > 0 ? ((good.length / totalStudents) * 100).toFixed(1) : 0}%)`}
                    color="bg-teal-500"
                    tooltip="Học sinh được đánh giá 'Hoàn thành tốt' vào cuối kỳ/cuối năm."
                />
                <StatCard 
                    icon={<TrendingDownIcon className="h-6 w-6 text-white"/>}
                    title="HS Chưa hoàn thành"
                    value={`${needsAttention.length} (${totalStudents > 0 ? ((needsAttention.length / totalStudents) * 100).toFixed(1) : 0}%)`}
                    color="bg-red-500"
                    tooltip="Học sinh được đánh giá 'Chưa hoàn thành' vào cuối kỳ/cuối năm."
                    onClick={() => onCardClick('Chi tiết Học sinh Chưa hoàn thành', needsAttention.map(s => ({student: s, class: classes.find(c => c.id === s.classId), reason: { type: 'summary', content: 'Đánh giá cuối kỳ: Chưa hoàn thành' } })))}
                />
            </>
        );
    } else {
        const needsAttentionStudents = students.filter(s => s.assessments.some(a => a.level === 'Chưa hoàn thành'));
        const needsAttentionCount = needsAttentionStudents.length;
        const needsAttentionPercent = totalStudents > 0 ? (needsAttentionCount / totalStudents) * 100 : 0;

        const classNeeds = students.reduce((acc, student) => {
            const needsHelp = student.assessments.some(a => a.level === 'Chưa hoàn thành');
            if (needsHelp) {
                acc[student.classId] = (acc[student.classId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const classTotals = students.reduce((acc, student) => {
            acc[student.classId] = (acc[student.classId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        let worstClassId = '';
        let classWithHighestNeeds = { name: 'N/A', percent: 0 };
        if (Object.keys(classNeeds).length > 0) {
            worstClassId = Object.keys(classNeeds).sort((a, b) => (classNeeds[b]/classTotals[b]) - (classNeeds[a]/classTotals[a]))[0];
            const worstClass = classes.find(c => c.id === worstClassId);
            classWithHighestNeeds = {
                name: worstClass?.name || 'N/A',
                percent: (classNeeds[worstClassId] / classTotals[worstClassId]) * 100
            };
        }
        
        const subjectNeeds = students.flatMap(s => s.assessments)
            .filter(a => a.level === 'Chưa hoàn thành')
            .reduce((acc, assessment) => {
                acc[assessment.subject] = (acc[assessment.subject] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

        let worstSubjectName = '';
        let subjectWithHighestNeeds = { name: 'N/A', count: 0 };
        if(Object.keys(subjectNeeds).length > 0) {
            worstSubjectName = Object.keys(subjectNeeds).sort((a,b) => subjectNeeds[b] - subjectNeeds[a])[0];
            subjectWithHighestNeeds = { name: worstSubjectName, count: subjectNeeds[worstSubjectName] };
        }

        stats = (
            <>
                <StatCard 
                    icon={<TrendingDownIcon className="h-6 w-6 text-white"/>}
                    title="HS Cần Hỗ Trợ"
                    value={`${needsAttentionCount} (${needsAttentionPercent.toFixed(1)}%)`}
                    color="bg-red-500"
                    tooltip="Học sinh có ít nhất 01 môn học được đánh giá 'Chưa hoàn thành' trong kỳ."
                    onClick={() => onCardClick('Chi tiết Học sinh cần hỗ trợ', needsAttentionStudents.map(s => ({ student: s, class: classes.find(c => c.id === s.classId), reason: { type: 'subjects', content: getUnfinishedSubjects(s) } })))}
                />
                 <StatCard 
                    icon={<WarningIcon className="h-6 w-6 text-white"/>}
                    title="Lớp Cần Quan Tâm Nhất"
                    value={classWithHighestNeeds.name}
                    subValue={classWithHighestNeeds.name !== 'N/A' ? `${classWithHighestNeeds.percent.toFixed(1)}% HS cần hỗ trợ` : ''}
                    color="bg-orange-500"
                    tooltip="Lớp có tỷ lệ % học sinh Cần Hỗ Trợ cao nhất toàn trường."
                    onClick={() => {
                        if (worstClassId) {
                            const worstClassStudents = needsAttentionStudents.filter(s => s.classId === worstClassId);
                            onCardClick(`HS Cần Hỗ Trợ - ${classWithHighestNeeds.name}`, worstClassStudents.map(s => ({ student: s, class: classes.find(c => c.id === s.classId), reason: { type: 'subjects', content: getUnfinishedSubjects(s) } })))
                        }
                    }}
                />
                <StatCard 
                    icon={<ClipboardListIcon className="h-6 w-6 text-white"/>}
                    title="Môn Cần Quan Tâm Nhất"
                    value={subjectWithHighestNeeds.name}
                    subValue={subjectWithHighestNeeds.name !== 'N/A' ? `${subjectWithHighestNeeds.count} trường hợp` : ''}
                    color="bg-yellow-600"
                    tooltip="Môn học có số lượng học sinh bị đánh giá 'Chưa hoàn thành' nhiều nhất toàn trường."
                    onClick={() => {
                         if (worstSubjectName) {
                            const studentsWithSubjectNeeds = needsAttentionStudents.filter(s => s.assessments.some(a => a.subject === worstSubjectName && a.level === 'Chưa hoàn thành'));
                            onCardClick(`HS Chưa Hoàn Thành - Môn ${worstSubjectName}`, studentsWithSubjectNeeds.map(s => ({ student: s, class: classes.find(c => c.id === s.classId), reason: { type: 'subjects', content: [worstSubjectName] } })))
                        }
                    }}
                />
            </>
        )
    }


    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Toàn cảnh học tập</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={<UsersIcon className="h-6 w-6 text-white"/>}
                    title="Tổng số học sinh"
                    value={totalStudents.toString()}
                    color="bg-indigo-500"
                    tooltip="Tổng số học sinh đang theo học tại trường."
                />
                {stats}
            </div>
        </div>
    );
};
