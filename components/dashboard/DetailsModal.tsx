import React, { useMemo } from 'react';
import { XIcon, UsersIcon } from '../Icons';
import type { ModalDataType } from './GradebookDashboard';
import type { SchoolClass } from '../../types';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: ModalDataType[];
  classes: SchoolClass[];
}

const ReasonDisplay: React.FC<{ reason: ModalDataType['reason'] }> = ({ reason }) => {
    if (reason.type === 'subjects') {
        const subjects = reason.content as string[];
        return (
            <div className="mt-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Kết quả đánh giá 'Chưa hoàn thành':
                </p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                    {subjects.map((subject, index) => (
                        <span 
                            key={index} 
                            className="px-2.5 py-1 text-xs font-semibold text-red-800 bg-red-100 dark:bg-red-900/50 dark:text-red-300 rounded-md"
                        >
                            {subject}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
            Lý do: {reason.content as string}
        </p>
    );
};

export const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, title, data, classes }) => {
  if (!isOpen) return null;

  const groupedData = useMemo(() => {
    // FIX: Explicitly define the accumulator type to help with type inference in the reduce function.
    // This resolves issues where properties of `studentClass` were being incorrectly typed as `unknown`.
    type GroupedData = Record<string, Record<string, { className: string, students: ModalDataType[] }>>;
    const classMap = new Map<string, SchoolClass>(classes.map(c => [c.id, c] as [string, SchoolClass]));

    return data.reduce((acc: GroupedData, item: ModalDataType) => {
        const studentClass = classMap.get(item.student.classId);
        if (!studentClass) return acc;

        const grade = studentClass.grade.toString();
        const classId = studentClass.id;

        if (!acc[grade]) {
            acc[grade] = {};
        }
        if (!acc[grade][classId]) {
            acc[grade][classId] = {
                className: studentClass.name,
                students: []
            };
        }
        acc[grade][classId].students.push(item);
        return acc;

    }, {} as GroupedData);
  }, [data, classes]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {Object.keys(groupedData).length > 0 ? (
            <div className="space-y-6">
                {Object.keys(groupedData).sort((a,b) => parseInt(a) - parseInt(b)).map(grade => (
                    <div key={grade}>
                        <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 pb-2 mb-3 border-b-2 border-indigo-200 dark:border-indigo-800">
                            Khối {grade}
                        </h4>
                        <div className="space-y-4">
                            {Object.keys(groupedData[grade]).map(classId => (
                                <div key={classId}>
                                    <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">{groupedData[grade][classId].className}</h5>
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
                                        {groupedData[grade][classId].students.map(({ student, reason }) => (
                                            <div key={student.id} className="p-3 flex items-start space-x-4">
                                                <div className="flex-shrink-0 mt-1 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                                   <UsersIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900 dark:text-white">{student.name}</p>
                                                    <ReasonDisplay reason={reason} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="text-center p-8">
                <p className="text-gray-500 dark:text-gray-400">Không có dữ liệu để hiển thị.</p>
            </div>
          )}
        </div>

         <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-right sticky bottom-0 bg-white dark:bg-gray-800 z-10">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Đóng
            </button>
        </div>
      </div>
    </div>
  );
};