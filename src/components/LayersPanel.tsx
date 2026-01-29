import React, { useState, useEffect } from 'react';

interface DatosCapa {
  id: string;
  nombre: string;
  tipo: string;
}

interface DatosElemento {
  id: string;
  nombre: string;
  datos: Record<string, unknown>;
  capaObjeto: any;
}

interface PropsPanelCapas {
  layers: DatosCapa[];
  onLayerToggle: (nombre: string, tipo: string, visible: boolean) => void;
  onElementToggle: (idCapa: string, idElemento: string, visible: boolean) => void;
  visibleElements: Record<string, Record<string, boolean>>;
  map: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const LayersPanel: React.FC<PropsPanelCapas> = ({
  layers,
  onLayerToggle,
  onElementToggle,
  visibleElements,
  map,
}) => {
  const [capasVisibles, setCapasVisibles] = useState<Record<string, boolean>>({});
  const [capasExpandidas, setCapasExpandidas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Inicializar todas las capas actuales como visibles si no están configuradas
    const inicialVisibles = { ...capasVisibles };
    layers.forEach((capa) => {
      if (inicialVisibles[capa.nombre] === undefined) {
        inicialVisibles[capa.nombre] = true;
      }
    });
    setCapasVisibles(inicialVisibles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  const obtenerIconoDetallado = (tipoRaw: string, nombreRaw: string): React.ReactNode => {
    const tipo = (tipoRaw || '').toLowerCase();
    const nombre = (nombreRaw || '').toLowerCase();

    // Proyectos (nuevo)
    if (tipo.includes('proyect') || nombre.includes('proyect')) {
      return (
        <div className="info-icon icon-project">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      );
    }

    // Árboles (arboles, trees, arbol)
    if (tipo.includes('arbol') || tipo.includes('tree')) {
      return (
        <div className="info-icon icon-tree">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="6" fill="#4CAF50" stroke="#2E7D32" strokeWidth="0.5" />
            <rect x="11" y="14" width="2" height="4" fill="#795548" />
            <rect x="8" y="18" width="8" height="1.5" rx="0.75" fill="#4CAF50" />
          </svg>
        </div>
      );
    }

    // Segmentos (segmentos, segments, lineas, camino)
    if (tipo.includes('segment') || tipo.includes('line') || tipo.includes('camino')) {
      return (
        <div className="info-icon icon-segment">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 18L9 13L15 13L20 8" />
            <circle cx="4" cy="18" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="20" cy="8" r="2.5" fill="currentColor" stroke="none" />
          </svg>
        </div>
      );
    }

    // Polígonos (poligonos, polygons, parcelas)
    if (tipo.includes('polig') || tipo.includes('poly') || tipo.includes('parcela') || tipo.includes('anillo')) {
      return (
        <div className="info-icon icon-polygon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4L20 8L18 18L6 18L4 8L12 4Z" fill="currentColor" fillOpacity="0.3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4L12 18" strokeOpacity="0.3" strokeWidth="1" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8L20 8" strokeOpacity="0.3" strokeWidth="1" />
          </svg>
        </div>
      );
    }

    // Default
    return (
      <div className="info-icon">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" /></svg>
      </div>
    );
  };

  const manejarAlternarCapa = (capa: DatosCapa) => {
    const nuevaVisibilidad = !capasVisibles[capa.nombre];
    setCapasVisibles({ ...capasVisibles, [capa.nombre]: nuevaVisibilidad });
    onLayerToggle(capa.nombre, capa.tipo, nuevaVisibilidad);
  };

  const toggleExpandir = (nombreCapa: string) => {
    setCapasExpandidas(prev => ({ ...prev, [nombreCapa]: !prev[nombreCapa] }));
  };

  return (
    <div id="layers-selector">
      <h3>Capas del Proyecto</h3>
      <div className="layers-list" id="layers-list">
        {layers.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>Selecciona un proyecto</p>
        ) : (
          layers.map((capa) => {
            const expandida = capasExpandidas[capa.nombre];
            const elementos = map?.capasDeElementos?.[capa.nombre] || {};
            const elementKeys = Object.keys(elementos);

            return (
              <div key={capa.id} className="layer-container">
                <div className="layer-item">
                  <div className="layer-info" onClick={() => toggleExpandir(capa.nombre)}>
                    <span className="material-icons expand-icon">
                      {expandida ? 'expand_more' : 'chevron_right'}
                    </span>
                    {obtenerIconoDetallado(capa.tipo, capa.nombre)}
                    <span className="layer-name">{capa.nombre}</span>
                  </div>
                  <span
                    className="layer-visibility"
                    onClick={() => manejarAlternarCapa(capa)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className={`material-icons ${capasVisibles[capa.nombre] ? 'visible' : 'hidden'}`}>
                      {capasVisibles[capa.nombre] ? 'visibility' : 'visibility_off'}
                    </span>
                  </span>
                </div>

                {expandida && elementKeys.length > 0 && (
                  <div className="elements-list">
                    {elementKeys.map((idElemento) => {
                      const elemento = elementos[idElemento] as DatosElemento;
                      const visible = visibleElements[capa.nombre]?.[idElemento] !== false;

                      return (
                        <div key={idElemento} className="element-item">
                          <span className="element-name" title={String(elemento.datos?.id || '')}>
                            {elemento.nombre}
                          </span>
                          <span
                            className="element-visibility"
                            onClick={() => onElementToggle(capa.nombre, idElemento, !visible)}
                          >
                            <span className={`material-icons ${visible ? 'visible' : 'hidden'}`}>
                              {visible ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {expandida && elementKeys.length === 0 && (
                  <div className="elements-list empty">
                    Cargando elementos...
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LayersPanel;
