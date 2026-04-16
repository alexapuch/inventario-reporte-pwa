import React from 'react';
import { Trash2, RotateCcw, XCircle, Grid, Folder } from 'lucide-react';

export function TrashView({ trashItems, onRestore, onPermanentDelete }) {
    if (trashItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">La papelera está vacía</h3>
                <p className="max-w-xs mx-auto mt-1">Los elementos que elimines aparecerán aquí durante 5 días antes de eliminarse permanentemente.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trashItems.map((item) => {
                const isFolder = item.type === 'folder';
                return (
                    <div
                        key={item.id}
                        className="group relative bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-900/50 transition-all cursor-default"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${isFolder ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                                {isFolder ? (
                                    <Folder className="text-amber-500 opacity-50" size={28} />
                                ) : (
                                    <Grid className="text-slate-400 opacity-50" size={28} />
                                )}
                            </div>
                            <div className="flex gap-1 z-20">
                                <button
                                    onClick={() => onRestore(item.id)}
                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                    title="Restaurar"
                                >
                                    <RotateCcw size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('¿Estás seguro de eliminar esto permanentemente? Esta acción no se puede deshacer.')) {
                                            onPermanentDelete(item.id);
                                        }
                                    }}
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                    title="Eliminar permanentemente"
                                >
                                    <XCircle size={18} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 line-clamp-1 opacity-75 decoration-slate-400">
                                {item.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Eliminado: {item.deletedAt?.toDate().toLocaleDateString()}
                            </p>
                            {isFolder && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 mt-2">
                                    Carpeta
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
