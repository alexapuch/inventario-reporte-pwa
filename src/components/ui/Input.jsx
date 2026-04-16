import React from 'react';
import { cn } from '../../lib/utils';
import './Input.css';

export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                'input',
                className
            )}
            {...props}
        />
    );
}
