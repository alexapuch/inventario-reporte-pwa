import React from 'react';
import { cn } from '../../lib/utils';
import './Card.css';

export function Card({ className, children, hoverable = false, ...props }) {
    return (
        <div
            className={cn(
                'card',
                hoverable && 'card-hoverable',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
