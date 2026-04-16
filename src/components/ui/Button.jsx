import React from 'react';
import { cn } from '../../lib/utils';
// import './Button.css'; // Removed old CSS dependency

/**
 * Button Component with Tailwind CSS
 */
export function Button({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    children,
    ...props
}) {
    const variants = {
        primary: 'bg-primary text-white hover:bg-blue-700 shadow-sm active:scale-95',
        secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 active:scale-95',
        danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 active:scale-95',
        outline: 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base'
    };

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                variants[variant] || variants.primary,
                sizes[size] || sizes.md,
                isLoading && 'cursor-wait opacity-70',
                className
            )}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}
