
import type React from 'react';
import type { MenuItem } from '../types';

interface SidebarProps {
  menuItems: MenuItem[];
  activeMenuItem: MenuItem;
  setActiveMenuItem: (item: MenuItem) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuItems, activeMenuItem, setActiveMenuItem, sidebarOpen, setSidebarOpen }) => {
  const handleItemClick = (item: MenuItem) => {
    setActiveMenuItem(item);
    if (window.innerWidth < 768) { // md breakpoint
        setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-900 text-white transition-transform duration-300 ease-in-out lg:static lg:inset-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-700">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <nav className="mt-4">
          <ul>
            {menuItems.map((item) => (
              <li key={item.id} className="px-4 py-1">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleItemClick(item);
                  }}
                  className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeMenuItem.id === item.id
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className="mr-4">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};
