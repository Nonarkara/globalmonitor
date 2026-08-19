import React from 'react';
import { SKY_LAYERS } from '../data/skyLayers';

const SkyStrip = ({ activeLayers, toggleLayer }) => (
    <div className="map-sky-strip" role="toolbar" aria-label="Sky and satellite overlays">
        {SKY_LAYERS.map((layer) => {
            const isActive = activeLayers.includes(layer.id);
            return (
                <button
                    key={layer.id}
                    type="button"
                    className={`map-sky-chip${isActive ? ' is-active' : ''}${layer.id === 'eo-true-color' ? ' map-sky-chip--photo' : ''}`}
                    aria-pressed={isActive}
                    aria-label={layer.aria}
                    title={layer.hint}
                    onClick={() => toggleLayer(layer.id)}
                >
                    {layer.title}
                </button>
            );
        })}
    </div>
);

export default SkyStrip;
