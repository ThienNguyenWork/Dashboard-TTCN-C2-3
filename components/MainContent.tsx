
import type React from 'react';
import type { MenuItem } from '../types';
import { GradebookDashboard } from './dashboard/GradebookDashboard';
import { ResourceLibraryDashboard } from './dashboard/ResourceLibraryDashboard';
import { LMSDashboard } from './dashboard/LMSDashboard';

interface MainContentProps {
  activeMenuItem: MenuItem;
}

export const MainContent: React.FC<MainContentProps> = ({ activeMenuItem }) => {
  if (activeMenuItem.id === 'so-ghi-diem') {
    return <GradebookDashboard />;
  }
  
  if (activeMenuItem.id === 'kho-hoc-lieu') {
    return <ResourceLibraryDashboard />;
  }

  if (activeMenuItem.id === 'lms') {
    return <LMSDashboard />;
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        Chào mừng đến với {activeMenuItem.label}
      </h2>
      <p className="text-gray-600 dark:text-gray-300">
        Nội dung chi tiết cho mục <span className="font-semibold text-indigo-500">{activeMenuItem.label}</span> sẽ được hiển thị ở đây.
      </p>
      <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Đây là khu vực hiển thị chính. Các chức năng, biểu đồ, và bảng dữ liệu sẽ được tích hợp vào đây trong các bản cập nhật sau.</p>
      </div>
    </div>
  );
};
