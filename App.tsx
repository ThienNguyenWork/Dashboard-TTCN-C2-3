import React from 'react';
import { Header } from './components/Header';
import { LMSDashboard } from './components/dashboard/LMSDashboard';

const App: React.FC = () => {
  return (
    <div className="flex h-screen flex-col bg-gray-100 dark:bg-gray-800 font-sans">
      <Header title="LMS - Bảng điều khiển Tổ trưởng chuyên môn" />
      
      <main className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <LMSDashboard />
        </div>
      </main>
    </div>
  );
};

export default App;