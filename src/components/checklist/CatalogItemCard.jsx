import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChecklistRow } from './ChecklistRow';
import { Badge } from '../ui/Badge';
import './CatalogItemCard.css';

export function CatalogItemCard({
    catalogItem,
    items,
    onAddClick,
    onUpdateRow,
    onDeleteRow
}) {
    // items = Array of checklist items provided by ChecklistView that match this catalog name (and category)

    const totalCount = items.reduce((acc, curr) => acc + (curr.count || 0), 0);
    const hasIssues = items.some(i => i.status !== 'good');

    return (
        <Card className="catalog-card">
            <div className="catalog-header">
                <div className="catalog-title-wrapper">
                    <h3 className="catalog-title">{catalogItem.name}</h3>
                    {totalCount > 0 && (
                        <Badge variant={hasIssues ? 'warning' : 'success'}>
                            Total: {totalCount}
                        </Badge>
                    )}
                </div>
                <Button size="sm" onClick={() => onAddClick(catalogItem)} className="add-btn">
                    <Plus size={16} /> Agregar
                </Button>
            </div>

            <div className="catalog-rows">
                {items.length > 0 ? (
                    items.map(item => (
                        <ChecklistRow
                            key={item.id}
                            item={item}
                            onUpdate={onUpdateRow}
                            onDelete={onDeleteRow}
                        />
                    ))
                ) : (
                    <div className="empty-catalog-row">
                        <span className="text-muted">Sin registros</span>
                    </div>
                )}
            </div>
        </Card>
    );
}
