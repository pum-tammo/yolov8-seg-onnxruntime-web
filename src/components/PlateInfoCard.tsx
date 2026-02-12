import React from 'react';
import type { PlateInfo } from '../types';
import './PlateInfoCard.css';

interface PlateInfoCardProps {
  plateInfo: PlateInfo | null;
  confidence?: number;
}

export const PlateInfoCard: React.FC<PlateInfoCardProps> = ({ plateInfo, confidence }) => {
  if (!plateInfo) {
    return (
      <div className="plate-info-card empty">
        <p>Kein Kennzeichen erkannt</p>
        <p className="hint">Richten Sie die Kamera auf ein Kennzeichen</p>
      </div>
    );
  }

  return (
    <div className="plate-info-card">
      <div className="plate-header">
        <h2>{plateInfo.plate}</h2>
        {confidence !== undefined && (
          <span className="confidence">{confidence.toFixed(1)}%</span>
        )}
      </div>
      
      <div className="plate-details">
        <div className="detail-row">
          <span className="label">Besitzer:</span>
          <span className="value">{plateInfo.owner}</span>
        </div>
        <div className="detail-row">
          <span className="label">Fahrzeug:</span>
          <span className="value">{plateInfo.vehicle}</span>
        </div>
        <div className="detail-row">
          <span className="label">Farbe:</span>
          <span className="value">{plateInfo.color}</span>
        </div>
        {plateInfo.notes && (
          <div className="detail-row">
            <span className="label">Notizen:</span>
            <span className="value">{plateInfo.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};
