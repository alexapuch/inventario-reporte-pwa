import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
// import './Modal.css'; // Logic moved to Tailwind

export function Modal({ isOpen, onClose, title, children, footer, className }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Content */}
            <div className={cn(
                "relative z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200",
                className
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
