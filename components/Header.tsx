import type React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="relative z-10 flex items-center justify-between h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 shadow-sm">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Nguyễn Văn A</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tổ trưởng chuyên môn</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 overflow-hidden">
            <img 
                src="https://ui-avatars.com/api/?name=To+Truong&background=4f46e5&color=fff" 
                alt="User Avatar" 
                className="w-full h-full object-cover" 
            />
        </div>
      </div>
    </header>
  );
};