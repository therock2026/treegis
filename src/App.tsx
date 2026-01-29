import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { supabase } from './config';
import './App.css';
import './cluster_styles.css';
import BaseMapSelector from './components/BaseMapSelector';
import ProjectSelector from './components/ProjectSelector';
import LayersPanel from './components/LayersPanel';

// Hacer L global para que el plugin de MarkerCluster (cargado vía CDN) pueda encontrarlo
(window as any).L = L;

interface DatosElemento {
  id: string;
  nombre: string;
  datos: Record<string, unknown>;
  capaObjeto: L.Layer;
}

type InstanciaMapa = L.Map & {
  grupoTodasLasCapas: L.FeatureGroup;
  gruposDeCapas: Record<string, L.LayerGroup>;
  capasVisibles: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  capasDeElementos: Record<string, Record<string, DatosElemento>>;
};

interface Proyecto {
  id: string;
  nombre: string;
}

const App: React.FC = () => {
  const contenedorMapa = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<InstanciaMapa | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>('');
  const [capas, setCapas] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [mapaCallejero, setMapaCallejero] = useState<L.TileLayer | null>(null);
  const [mapaSatelital, setMapaSatelital] = useState<L.TileLayer | null>(null);
  const [mapaGris, setMapaGris] = useState<L.TileLayer | null>(null);
  const [elementosVisibles, setElementosVisibles] = useState<Record<string, Record<string, boolean>>>({});

  // Inicializar mapa
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mapaRef.current && contenedorMapa.current) {
      mapaRef.current = L.map('map').setView([-36.67, -60.56], 6) as InstanciaMapa;

      const callejero = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      });

      const satelital = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          attribution: '© Esri',
        }
      );

      const gris = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      });

      callejero.addTo(mapaRef.current);
      setMapaCallejero(callejero);
      setMapaSatelital(satelital);
      setMapaGris(gris);

      mapaRef.current.grupoTodasLasCapas = L.featureGroup();
      mapaRef.current.gruposDeCapas = {};
      mapaRef.current.capasVisibles = {};
      mapaRef.current.capasDeElementos = {};
    }

    return () => {
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
      }
    };
  }, []);

  // Cargar proyectos
  useEffect(() => {
    cargarProyectos();
  }, []);

  const cargarProyectos = async () => {
    try {
      const { data, error } = await supabase.from('proyectos').select('id, nombre');
      if (error) throw error;
      if (data) {
        setProyectos(data);
      }
    } catch (err) {
      console.error('Error al cargar proyectos:', err);
    }
  };

  const manejarCambioProyecto = (idProyecto: string) => {
    setProyectoSeleccionado(idProyecto);
    setElementosVisibles({}); // Reiniciar elementos visibles al cambiar de proyecto
    if (idProyecto) {
      cargarCapasProyecto(idProyecto);
    } else {
      setCapas([]);
      if (mapaRef.current?.gruposDeCapas) {
        Object.values(mapaRef.current.gruposDeCapas).forEach((grupo) => {
          if (mapaRef.current) mapaRef.current.removeLayer(grupo);
        });
        mapaRef.current.gruposDeCapas = {};
        mapaRef.current.capasDeElementos = {};
      }
    }
  };

  const cargarCapasProyecto = async (idProyecto: string) => {
    try {
      // Limpiar capas anteriores
      if (mapaRef.current?.gruposDeCapas) {
        Object.values(mapaRef.current.gruposDeCapas).forEach((grupo) => {
          if (mapaRef.current) mapaRef.current.removeLayer(grupo);
        });
        mapaRef.current.gruposDeCapas = {};
        mapaRef.current.capasDeElementos = {};
      }

      if (mapaRef.current?.grupoTodasLasCapas) {
        mapaRef.current.grupoTodasLasCapas.clearLayers();
      }

      const { data, error } = await supabase
        .from('capas')
        .select('id, nombre, tipo')
        .eq('id_proyecto', idProyecto);

      if (error) throw error;
      if (data) {
        setCapas(data);
        // Cargar datos de la capa
        data.forEach((capa) => {
          cargarYMostrarCapa(capa.nombre, capa.tipo, capa.id);
        });

        // Ajustar vista después de cargar
        setTimeout(() => {
          if (
            mapaRef.current?.grupoTodasLasCapas &&
            mapaRef.current.grupoTodasLasCapas.getLayers().length > 0
          ) {
            try {
              const bounds = mapaRef.current.grupoTodasLasCapas.getBounds();
              if (bounds.isValid()) {
                mapaRef.current.fitBounds(bounds, {
                  padding: [20, 20],
                  maxZoom: 18,
                  animate: true
                });
              }
            } catch (err) {
              console.log('No se pudieron ajustar los límites:', err);
            }
          }
        }, 800);
      }
    } catch (err) {
      console.error('Error al cargar las capas:', err);
    }
  };

  const cargarYMostrarCapa = async (
    idCapa: string,
    tipoCapa: string,
    idFisicoCapa: string | number
  ) => {
    try {
      // Normalizamos el nombre de la tabla
      let nombreTabla = tipoCapa.toLowerCase();
      if (nombreTabla === 'trees' || nombreTabla === 'arboles') nombreTabla = 'arboles';
      else if (nombreTabla === 'segments' || nombreTabla === 'segmentos') nombreTabla = 'segmentos';
      else if (nombreTabla === 'polygons' || nombreTabla === 'poligonos') nombreTabla = 'poligonos';

      const campoFiltro = 'id_capa';
      const valorFiltro = idFisicoCapa;

      console.log(`[GIS] Consultando Tabla: ${nombreTabla}, Filtro: ${campoFiltro} = ${valorFiltro}`);

      const { data, error } = await supabase
        .from(nombreTabla)
        .select('*')
        .eq(campoFiltro, valorFiltro);

      if (error) {
        console.error(`[GIS] Error en tabla ${nombreTabla}:`, error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn(`[GIS] No se encontraron datos en ${nombreTabla} para id_capa ${valorFiltro}`);
        return;
      }

      console.log(`[GIS] ${data.length} elementos cargados de ${nombreTabla}. Campos disponibles:`, Object.keys(data[0]));

      if (!mapaRef.current?.gruposDeCapas || !mapaRef.current.capasDeElementos) return;

      // Intentar usar MarkerClusterGroup si está disponible (cargado vía CDN)
      const esArbol = nombreTabla === 'arboles';
      let grupoCapa: any;

      const L_con_plugins = (window as any).L || L;

      if (esArbol && typeof L_con_plugins.markerClusterGroup === 'function') {
        console.log('[GIS] Usando MarkerClusterGroup para árboles');
        grupoCapa = L_con_plugins.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 18,
          chunkedLoading: true,
          iconCreateFunction: (cluster: any) => {
            const markers = cluster.getAllChildMarkers();
            const count = markers.length;

            let riesgo = 0;
            let poda = 0;

            markers.forEach((m: any) => {
              const color = m.options?.fillColor || (m.options?.color && m.options.color !== '#ffffff' ? m.options.color : null);
              if (color === '#d32f2f') riesgo++;
              else if (color === '#fbc02d') poda++;
            });

            let claseColor = 'cluster-saludable';
            if (riesgo > 0) claseColor = 'cluster-riesgo';
            else if (poda > 0) claseColor = 'cluster-poda';

            return L_con_plugins.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: `marker-cluster ${claseColor}`,
              iconSize: L_con_plugins.point(40, 40)
            });
          }
        });
      } else {
        console.log(`[GIS] Usando FeatureGroup estándar para ${nombreTabla} (Clusterer disponible: ${typeof L_con_plugins.markerClusterGroup === 'function'})`);
        grupoCapa = L.featureGroup();
      }

      let itemsAgregados = 0;
      const mapaElementos: Record<string, DatosElemento> = {};

      // Inicializar seguimiento de elementos para esta capa
      if (!mapaRef.current.capasDeElementos[idCapa]) {
        mapaRef.current.capasDeElementos[idCapa] = {};
      }

      // Inicializar estado de elementos visibles si no existe
      setElementosVisibles(prev => {
        if (prev[idCapa]) return prev;
        return { ...prev, [idCapa]: {} };
      });

      data.forEach((item: Record<string, any>, indice: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const idElemento = `${idCapa}-${indice}`;
        const nombreElemento = item.nombre || item.name || item.label || `${tipoCapa} ${indice + 1}`;

        let capaFinal: L.Layer | null = null;

        // 1. Intentar procesar como Estándar GIS (Priorizar campos específicos del usuario)
        const rawGeom = item.caminos || item.anillos || item.geom || item.geometry || item.geojson || item.the_geom || item.poligono;

        if (rawGeom) {
          try {
            let geojson: any = null;
            const esPoligono = tipoCapa.toLowerCase().includes('poly') || tipoCapa.toLowerCase().includes('poligono') || !!item.anillos;

            // 1. EXTRACTOR UNIVERSAL: Extraer todos los números y armar pares [Lon, Lat]
            const rawString = typeof rawGeom === 'object' ? JSON.stringify(rawGeom) : String(rawGeom);
            const matches = rawString.match(/-?\d+\.\d+|-?\d+/g);

            if (matches && matches.length >= 2) {
              const nums = matches.map(Number);
              const puntos = [];
              for (let i = 0; i < nums.length; i += 2) {
                if (nums[i + 1] !== undefined) {
                  const v1 = nums[i];
                  const v2 = nums[i + 1];
                  // Inversión Cono Sur: Si |v1| < |v2|, v1 es Lat y v2 es Lon -> Estándar [Lon, Lat]
                  if (Math.abs(v1) < Math.abs(v2)) {
                    puntos.push([v2, v1]);
                  } else {
                    puntos.push([v1, v2]);
                  }
                }
              }

              if (puntos.length > 0) {
                geojson = {
                  type: (esPoligono && puntos.length > 2) ? "Polygon" : "LineString",
                  coordinates: (esPoligono && puntos.length > 2) ? [puntos] : puntos
                };
              }
            }

            // Fallback para GeoJSON formal si el extractor simple no fuera suficiente (aunque ahora es universal)
            if (!geojson && typeof rawGeom === 'object' && (rawGeom as any).type) {
              geojson = rawGeom;
            }

            // Estilos específicos
            const estiloGis = {
              style: () => {
                const tipo = tipoCapa.toLowerCase();
                if (tipo.includes('segment') || tipo.includes('line') || tipo.includes('camino')) {
                  return { color: '#1976d2', weight: 3, opacity: 0.9 }; // Grosor reducido a 3px
                }
                return { color: '#f57c00', weight: 4, opacity: 0.8, fillOpacity: 0.4 };
              },
              pointToLayer: (_feature: any, latlng: L.LatLng) => {
                const condicion = (item.condicion || '').toLowerCase();
                let colorSemaforo = '#2e7d32'; // Verde: Saludable (por defecto)

                if (condicion.includes('poda') || condicion.includes('regul') || condicion.includes('medio')) {
                  colorSemaforo = '#fbc02d'; // Amarillo: Necesita Poda / Regular
                } else if (condicion.includes('riesgo') || condicion.includes('mal') || condicion.includes('critico')) {
                  colorSemaforo = '#d32f2f'; // Rojo: Riesgo / Malo
                }

                return L.circleMarker(latlng, {
                  radius: 6,
                  fillColor: colorSemaforo,
                  color: '#ffffff',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 1,
                });
              }
            };

            const tempLayer = L.geoJSON(geojson as any, estiloGis);

            if (tempLayer.getLayers().length > 0) {
              capaFinal = tempLayer;
              // Añadir popup con información de condición
              const infoCondicion = item.condicion ? `<br>Condición: ${item.condicion}` : '';
              capaFinal.bindPopup(`<b>${nombreElemento}</b>${infoCondicion}<br>ID: ${item.id}`);
              console.log(`[GIS] Capa GeoJSON creada para ${idElemento} con color: ${item.condicion || 'por defecto'}`);
            }
            else {
              console.warn(`[GIS] GeoJSON parsing resultó en 0 capas para ${idElemento}`);
            }
          } catch (e) {
            console.error(`[GIS] Error procesando geometría para ${idElemento}:`, e);
          }
        }

        // 2. Fallback: Coordenadas explícitas (Puntos)
        if (!capaFinal && item.latitud !== undefined && item.longitud !== undefined) {
          const condicion = (item.condicion || '').toLowerCase();
          let colorSemaforo = '#2e7d32';
          if (condicion.includes('poda') || condicion.includes('regul') || condicion.includes('medio')) colorSemaforo = '#fbc02d';
          else if (condicion.includes('riesgo') || condicion.includes('mal') || condicion.includes('critico')) colorSemaforo = '#d32f2f';

          capaFinal = L.circleMarker([item.latitud, item.longitud], {
            radius: 6,
            fillColor: colorSemaforo,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1,
          });
        }

        // Si logramos crear la capa, la configuramos y agregamos
        if (capaFinal) {
          const infoCondicion = item.condicion ? `<br><b>Condición:</b> ${item.condicion}` : '';
          capaFinal.bindPopup(`<b>${nombreElemento}</b>${infoCondicion}<br>ID: ${item.id}`);

          // Si el grupo es un clusterer, necesitamos añadir las subcapas individuales si es GeoJSON
          if (esArbol && typeof grupoCapa.addLayers === 'function') {
            if (capaFinal instanceof L.GeoJSON) {
              const subLayers = (capaFinal as L.GeoJSON).getLayers();
              grupoCapa.addLayers(subLayers);
            } else {
              grupoCapa.addLayer(capaFinal);
            }
          } else {
            grupoCapa.addLayer(capaFinal);
          }

          mapaElementos[idElemento] = {
            id: idElemento,
            nombre: nombreElemento,
            datos: item,
            capaObjeto: capaFinal
          };
          itemsAgregados++;
        }
      });

      console.log(`[GIS] Finalizado: ${itemsAgregados} elementos agregados al grupo de la capa ${idCapa}`);

      if (itemsAgregados > 0) {
        grupoCapa.addTo(mapaRef.current);
        mapaRef.current.gruposDeCapas[idCapa] = grupoCapa;
        mapaRef.current.capasDeElementos[idCapa] = mapaElementos;

        grupoCapa.eachLayer((capaObjeto: L.Layer) => {
          if (mapaRef.current?.grupoTodasLasCapas) {
            mapaRef.current.grupoTodasLasCapas.addLayer(capaObjeto);
          }
        });
      }
    } catch (err) {
      console.error('Error al cargar la capa:', err);
    }
  };

  const manejarCambioMapaBase = (tipoMapa: string) => {
    if (!mapaRef.current || !mapaCallejero || !mapaSatelital || !mapaGris) return;

    // Remover todas las capas base actuales
    mapaRef.current.removeLayer(mapaCallejero);
    mapaRef.current.removeLayer(mapaSatelital);
    mapaRef.current.removeLayer(mapaGris);

    // Añadir la seleccionada
    if (tipoMapa === 'osm') {
      mapaCallejero.addTo(mapaRef.current);
    } else if (tipoMapa === 'satellite') {
      mapaSatelital.addTo(mapaRef.current);
    } else if (tipoMapa === 'carto') {
      mapaGris.addTo(mapaRef.current);
    }
  };

  const manejarAlternarCapa = async (nombreCapa: string, tipoCapa: string, visible: boolean) => {
    if (visible) {
      // Buscamos el ID físico de la capa en el estado actual
      const capaInfo = capas.find(c => c.nombre === nombreCapa);
      if (capaInfo) {
        await cargarYMostrarCapa(nombreCapa, tipoCapa, capaInfo.id);
      }
    } else {
      if (mapaRef.current?.gruposDeCapas && mapaRef.current.gruposDeCapas[nombreCapa]) {
        mapaRef.current.removeLayer(mapaRef.current.gruposDeCapas[nombreCapa]);
        delete mapaRef.current.gruposDeCapas[nombreCapa];
      }
    }
  };

  const manejarAlternarElemento = (idCapa: string, idElemento: string, visible: boolean) => {
    if (!mapaRef.current?.capasDeElementos?.[idCapa]?.[idElemento]) return;

    const elemento = mapaRef.current.capasDeElementos[idCapa][idElemento];
    const grupoCapa = mapaRef.current.gruposDeCapas?.[idCapa];

    if (!grupoCapa) return;

    if (visible) {
      grupoCapa.addLayer(elemento.capaObjeto);
    } else {
      grupoCapa.removeLayer(elemento.capaObjeto);
    }

    // Actualizar estado de visibilidad
    setElementosVisibles(prev => {
      const nuevoEstado = { ...prev };
      if (!nuevoEstado[idCapa]) {
        nuevoEstado[idCapa] = {};
      }
      nuevoEstado[idCapa] = { ...nuevoEstado[idCapa], [idElemento]: visible };
      return nuevoEstado;
    });
  };

  return (
    <div className="app">
      <div id="map" ref={contenedorMapa}></div>
      <BaseMapSelector onBaseMapChange={manejarCambioMapaBase} />
      <ProjectSelector projects={proyectos} onProjectChange={manejarCambioProyecto} />
      {proyectoSeleccionado && (
        <LayersPanel
          layers={capas}
          onLayerToggle={manejarAlternarCapa}
          onElementToggle={manejarAlternarElemento}
          visibleElements={elementosVisibles}
          map={mapaRef.current}
        />
      )}
    </div>
  );
};

export default App;
