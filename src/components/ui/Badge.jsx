import React from 'react';
import { cn } from '../../lib/utils';
import './Badge.css';

const variants = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    outline: 'badge-outline',
};

export function Badge({ className, variant = 'default', children, ...props }) {
    return (
        <div className={cn('badge', variants[variant], className)} {...props}>
            {children}
        </div>
    );
}
