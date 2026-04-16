import React from 'react';
import { Folder, MoreVertical, Trash2, Calendar, FolderOpen, ArrowRight, Plus, Pencil, Box, Move, Check } from 'lucide-react';

export function CompanyList({ companies, onSelect, onDelete, onOpenCreate, onRename, currentFolderId, onNavigate, onMove }) {
    // Filter companies based on current folder
    const visibleItems = companies.filter(c => {
        if (currentFolderId) {
            return c.parentId === currentFolderId;
        }
        return !c.parentId;
    });

    if (visibleItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                    <Folder size={32} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Carpeta vacía</h3>
                <p className="text-slate-500 mb-6">Comienza creando una carpeta o un proyecto.</p>
                <button
                    onClick={onOpenCreate}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-primary/20"
                >
                    Crear Nuevo
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleItems.map((item) => {
                const isFolder = item.type === 'folder';
                const isFinalized = item.status === 'FINALIZADO';

                // Date Fix
                const createdAt = item.createdAt?.toDate
                    ? item.createdAt.toDate()
                    : new Date(item.createdAt || Date.now());

                const formattedDate = createdAt.toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const cardClassName = `group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-[0.98] border ${isFinalized
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 hover:border-emerald-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/30'
                    }`;

                const iconContainerClass = `p-3 rounded-xl group-hover:scale-110 transition-transform ${isFinalized
                    ? 'bg-emerald-100 dark:bg-emerald-900/20'
                    : (isFolder ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20')
                    }`;

                const badgeClass = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isFinalized
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : (isFolder ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                    }`;

                const badgeText = isFinalized
                    ? 'Completado'
                    : (isFolder ? 'Grupo' : 'Proyecto');

                return (
                    <div
                        key={item.id}
                        className={cardClassName}
                        onClick={() => isFolder ? onNavigate(item.id) : onSelect(item)}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={iconContainerClass}>
                                    {isFinalized ? (
                                        <Check className="text-emerald-600" size={28} />
                                    ) : (
                                        isFolder ? (
                                            <Folder className="text-amber-500" size={28} />
                                        ) : (
                                            <Box className="text-primary" size={28} />
                                        )
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMove(item);
                                        }}
                                        className="p-3 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors z-20 md:p-2"
                                        title="Mover a..."
                                    >
                                        <Move size={20} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newName = prompt("Nuevo nombre:", item.name);
                                            if (newName && newName.trim() !== item.name) {
                                                onRename(item.id, newName.trim());
                                            }
                                        }}
                                        className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors z-20 md:p-2"
                                        title="Renombrar"
                                    >
                                        <Pencil size={20} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
                                                onDelete(item.id);
                                            }
                                        }}
                                        className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors z-20 md:p-2"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors text-slate-900 dark:text-white capitalize truncate">
                                {item.name}
                            </h3>

                            <div className="mt-4 space-y-3">
                                {isFolder ? (
                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                        <FolderOpen size={16} className="mr-2 opacity-70" />
                                        Carpeta
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <Calendar size={16} className="mr-2 opacity-70" />
                                            Actualizado: {formattedDate}
                                        </div>
                                        <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                            <FolderOpen size={16} className="mr-2 opacity-70" />
                                            {item.checklists?.length || 0} registros
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <span className={badgeClass}>
                                    {badgeText}
                                </span>
                                <button
                                    className="inline-flex items-center text-sm font-semibold text-primary hover:gap-2 transition-all"
                                >
                                    {isFolder ? 'Abrir Carpeta' : 'Abrir Inventario'} <ArrowRight size={16} className="ml-1" />
                                </button>
                            </div>
                        </div>
                        <div className={`h-1 scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${isFolder ? 'bg-amber-500' : 'bg-primary'}`}></div>
                    </div>
                );
            })}

            {/* "Create New" Card */}
            <button
                onClick={onOpenCreate}
                className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 hover:border-primary hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 min-h-[250px] active:scale-[0.98]"
            >
                <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Plus size={32} className="text-slate-400 group-hover:text-primary" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">Crear Nuevo</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Añade carpeta o proyecto</p>
            </button>
        </div>
    );
}
