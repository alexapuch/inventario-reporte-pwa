import React, { useState } from 'react';
import { Package, Folder, LayoutDashboard, History, Settings, User, LogOut, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MagicFixButton } from './MagicFixButton';

export function Sidebar({ companies, onNavigateFolder, onSelectProject, currentFolderId, activeCompanyId, isOpen, onClose }) {
    const { logout, currentUser } = useAuth();
    const [isProjectsOpen, setIsProjectsOpen] = useState(true);

    // Helper to get initials or first name? No, design shows "Alex Puch"
    // For now we use the email or a placeholder name
    const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "Usuario";

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                            <Package size={24} strokeWidth={2} />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">StockMaster</span>
                    </div>
                    {/* Close Button (Mobile) */}
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <nav className="space-y-1">
                    <button
                        onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                        className="w-full flex items-center justify-between px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors"
                    >
                        <span>Proyectos</span>
                        {isProjectsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div className={`space-y-1 transition-all duration-300 overflow-hidden ${isProjectsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        {/* Home / Root */}
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                onNavigateFolder(null);
                                onSelectProject(null);
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${!currentFolderId && !activeCompanyId
                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <LayoutDashboard size={20} />
                            <span className="truncate">Inicio</span>
                        </a>

                        {companies.filter(c => !c.parentId).map(company => {
                            const isActive = (company.type === 'folder' && currentFolderId === company.id) ||
                                (company.type !== 'folder' && activeCompanyId === company.id);

                            return (
                                <a
                                    key={company.id}
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (company.type === 'folder') {
                                            onNavigateFolder(company.id);
                                            onSelectProject(null); // Deselect project when entering folder
                                        } else {
                                            onSelectProject(company.id);
                                        }
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isActive
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-primary font-medium'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {company.type === 'folder' ? (
                                        <Folder size={20} className={isActive ? "text-primary" : "text-amber-500"} />
                                    ) : (
                                        <Folder size={20} />
                                    )}
                                    <span className="truncate">{company.name}</span>
                                </a>
                            )
                        })}

                        {companies.length === 0 && (
                            <p className="px-3 text-sm text-slate-400 italic">No hay proyectos</p>
                        )}
                    </div>
                </nav>

                <nav className="mt-8 space-y-1">
                    <p className="px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">General</p>
                    <a className="flex items-center gap-3 px-3 py-2 text-primary bg-blue-50 dark:bg-blue-900/20 rounded-lg font-medium" href="#">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </a>

                    <button
                        onClick={() => {
                            onNavigateFolder('trash'); // Special ID for trash view? Or separate prop?
                            onSelectProject(null);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${currentFolderId === 'trash'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <Trash2 size={20} />
                        <span className="truncate">Papelera</span>
                    </button>
                </nav>
                <MagicFixButton
                    items={companies.find(c => c.id === activeCompanyId)?.checklists || []}
                    activeCompanyId={activeCompanyId}
                    currentUser={currentUser}
                />
            </div>

            <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <User size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-slate-900 dark:text-white">{displayName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
