import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export function Layout({ children, companies, onNavigateFolder, onSelectProject, currentFolderId, activeCompanyId }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar
                companies={companies}
                onNavigateFolder={onNavigateFolder}
                onSelectProject={onSelectProject}
                currentFolderId={currentFolderId}
                activeCompanyId={activeCompanyId}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col relative w-full">
                {/* Mobile Header for Hamburger */}
                <div className="lg:hidden p-4 pb-0 flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <Menu size={24} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <span className="font-bold text-lg ml-2 text-slate-900 dark:text-white">StockMaster</span>
                </div>

                {children}
            </main>
        </div>
    );
}
