import React, { useState, useCallback } from 'react';

// 1. Definimos los tipos de mapa como un union type para evitar strings "mágicos"
type TipoMapa = 'osm' | 'satellite' | 'carto';

interface PropsSelectorMapaBase {
  onBaseMapChange: (mapType: TipoMapa) => void;
  inicialMapa?: TipoMapa; // Prop opcional para mayor flexibilidad
}

const BaseMapSelector: React.FC<PropsSelectorMapaBase> = ({
  onBaseMapChange,
  inicialMapa = 'osm'
}) => {
  const [mapaActivo, setMapaActivo] = useState<TipoMapa>(inicialMapa);

  // 2. Usamos useCallback para evitar recrear la función en cada renderizado
  const manejarCambioMapa = useCallback((tipoMapa: TipoMapa) => {
    if (tipoMapa !== mapaActivo) {
      setMapaActivo(tipoMapa);
      onBaseMapChange(tipoMapa);
    }
  }, [mapaActivo, onBaseMapChange]);

  return (
    <nav id="basemap-selector" aria-label="Selector de mapa base">
      <p id="basemap-label">Mapa Base</p>
      <div
        className="basemap-buttons"
        role="group"
        aria-labelledby="basemap-label"
      >
        <button
          type="button"
          className={`basemap-btn ${mapaActivo === 'osm' ? 'active' : ''}`}
          onClick={() => manejarCambioMapa('osm')}
          aria-pressed={mapaActivo === 'osm'}
        >
          <span className="material-icons">map</span> Color
        </button>

        <button
          type="button"
          className={`basemap-btn ${mapaActivo === 'carto' ? 'active' : ''}`}
          onClick={() => manejarCambioMapa('carto')}
          aria-pressed={mapaActivo === 'carto'}
        >
          <span className="material-icons">edit_road</span> Gris (Calles)
        </button>

        <button
          type="button"
          className={`basemap-btn ${mapaActivo === 'satellite' ? 'active' : ''}`}
          onClick={() => manejarCambioMapa('satellite')}
          aria-pressed={mapaActivo === 'satellite'}
        >
          <span className="material-icons">layers</span> Satelital
        </button>
      </div>
    </nav>
  );
};

export default BaseMapSelector;