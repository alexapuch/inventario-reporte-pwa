import React from 'react';
import { Card } from '../ui/Card';
import { ChevronRight, AlertGrid, CheckCircle } from 'lucide-react';
import './ZoneCard.css';

export function ZoneCard({ zoneName, items, onClick }) {
    // Items = array of items belonging to this zone
    const totalItems = items.reduce((acc, curr) => acc + (curr.count || 0), 0);
    const badItems = items.filter(i => i.status === 'bad').length;
    // const goodItems = items.filter(i => i.status === 'good').length;

    return (
        <Card className="zone-card" onClick={onClick}>
            <div className="zone-main">
                <h3 className="zone-title">{zoneName}</h3>
                <div className="zone-stats">
                    <span className="stat-badge total">
                        {totalItems} Elementos
                    </span>
                    {badItems > 0 && (
                        <span className="stat-badge bad">
                            ⚠️ {badItems} Mal estado
                        </span>
                    )}
                </div>
            </div>
            <div className="zone-arrow">
                <ChevronRight size={20} className="text-secondary" />
            </div>
        </Card>
    );
}
