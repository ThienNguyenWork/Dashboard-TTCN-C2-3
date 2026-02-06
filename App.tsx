import React from 'react';
import { Header } from './components/Header';
import { LMSDashboard } from './components/dashboard/LMSDashboard';

const App: React.FC = () => {
  return (
    <div className="flex h-screen flex-col bg-gray-100 dark:bg-gray-800 font-sans">
      <Header title="LMS - Bảng điều khiển Tổ trưởng chuyên môn" />
      
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
        <LMSDashboard />
      </main>
    </div>
  );
};

export default App;