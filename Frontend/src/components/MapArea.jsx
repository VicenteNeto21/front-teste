import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createHiveIcon } from './HiveMarker';
import { buscarApiarios, buscarColmeias } from '../services/apiarioService';

// Define o ícone padrão do Leaflet como o nosso HiveMarker
L.Marker.prototype.options.icon = createHiveIcon();

/**
 * Função auxiliar para converter string para número com validação
 * @param {string|number} value - Valor a converter
 * @returns {number|null} - Número convertido ou null
 */
const parseCoordinate = (value) => {
    if (value === null || value === undefined || value === '') return null;

    // Se for número, retorna direto
    if (typeof value === 'number') {
        return isNaN(value) ? null : value;
    }

    // Se for string, remove espaços e converte
    const str = String(value).trim();
    if (str === '' || str === 'Não informado' || str === 'null' || str === 'undefined') {
        return null;
    }

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
};

/**
 * Valida se coordenadas estão dentro do range válido
 * @param {number} lat - Latitude (-90 a 90)
 * @param {number} lng - Longitude (-180 a 180)
 * @returns {boolean}
 */
const isValidCoordinate = (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Calcula um deslocamento para evitar sobreposição de marcadores (efeito spider)
 * @param {number} lat - Latitude original
 * @param {number} lng - Longitude original
 * @param {number} index - Índice do marcador no grupo
 * @param {number} total - Total de marcadores no grupo
 * @returns {[number, number]} - Nova posição [lat, lng]
 */
const getSpiderOffset = (lat, lng, index, total) => {
    if (total <= 1) return [lat, lng];

    // Raio do círculo de dispersão (aproximadamente 20-25 metros)
    const radius = 0.00020;
    const angle = (index / total) * 2 * Math.PI;

    return [
        lat + (Math.cos(angle) * radius),
        lng + (Math.sin(angle) * radius)
    ];
};

// Componente para voar até uma localização específica
const FlyToLocation = ({ location }) => {
    const map = useMap();

    useEffect(() => {
        if (location && location.lat && location.lng) {
            map.flyTo([location.lat, location.lng], 16, {
                duration: 1.5
            });
        }
    }, [location, map]);

    return null;
};

const LocationMarker = () => {
    const [position, setPosition] = useState(null);
    const map = useMapEvents({
        locationfound(e) {
            setPosition(e.latlng);
            // Salva a localização no localStorage para usar como inicial na próxima vez
            localStorage.setItem('hf_user_location', JSON.stringify({
                lat: e.latlng.lat,
                lng: e.latlng.lng
            }));
            map.flyTo(e.latlng, 14, { duration: 1.5 });
        },
    });

    useEffect(() => {
        map.locate();
    }, [map]);

    return position === null ? null : (
        <Marker position={position}>
            <Popup>Sua localização atual</Popup>
        </Marker>
    );
};

// Componente para polígono clicável
const ClickablePolygon = ({ apiary, navigate }) => {
    const handleClick = () => {
        navigate(`/apiario/${apiary.id}`);
    };

    if (!apiary.polygon || apiary.polygon.length === 0) return null;

    // Validar todos os pontos do polígono
    const validPositions = apiary.polygon
        .map(p => {
            const lat = parseCoordinate(p.lat);
            const lng = parseCoordinate(p.lng);

            // Retorna null se coordenadas inválidas
            if (lat === null || lng === null || !isValidCoordinate(lat, lng)) {
                return null;
            }
            return [lat, lng];
        })
        .filter(pos => pos !== null); // Remove posições inválidas

    // Se não tem posições válidas, não renderiza
    if (validPositions.length < 3) {
        console.warn(`⚠️ Polígono de "${apiary.nomeApelido}" tem coordenadas inválidas. Pulando renderização.`);
        return null;
    }

    return (
        <Polygon
            positions={validPositions}
            pathOptions={{
                color: '#ffbd59',
                fillColor: '#ffbd59',
                fillOpacity: 0.2,
                weight: 2
            }}
            eventHandlers={{
                click: handleClick
            }}
        >
            <Popup>
                <strong>{apiary.nomeApelido}</strong><br />
                Tipo: {apiary.tipoAbelha || 'N/A'}<br />
                <em style={{ fontSize: '12px', color: '#666' }}>Clique para ver detalhes</em>
            </Popup>
        </Polygon>
    );
};

// Componente para marcador quando só houver coordenadas (sem polígono)
const ApiaryMarker = ({ apiary, navigate }) => {
    const handleClick = () => {
        navigate(`/apiario/${apiary.id}`);
    };

    // Se tem polygon, deixa o ClickablePolygon renderizar
    if (apiary.polygon && apiary.polygon.length > 0) return null;

    // Tentar múltiplas formas de obter coordenadas com validação
    const lat = parseCoordinate(apiary.coord_Y || apiary.latitude);
    const lng = parseCoordinate(apiary.coord_X || apiary.longitude);

    // Validação rigorosa
    if (lat === null || lng === null) {
        // Sem coordenadas válidas
        return null;
    }

    // Validação de range
    if (!isValidCoordinate(lat, lng)) {
        console.warn(
            `⚠️ Apiário "${apiary.nomeApelido}" (ID: ${apiary.id}) tem coordenadas fora do range:`,
            { coord_X: apiary.coord_X, coord_Y: apiary.coord_Y, lat, lng }
        );
        return null;
    }

    return (
        <Marker
            position={[lat, lng]}
            icon={createHiveIcon()}
            eventHandlers={{
                click: handleClick
            }}
        >
            <Popup>
                <strong>{apiary.nomeApelido}</strong><br />
                Tipo: {apiary.tipoAbelha || 'N/A'}<br />
                Coord: [{lat.toFixed(4)}, {lng.toFixed(4)}]<br />
                <em style={{ fontSize: '12px', color: '#666' }}>Clique para ver detalhes</em>
            </Popup>
        </Marker>
    );
};

const MapArea = ({ flyToLocation }) => {
    const navigate = useNavigate();

    // Usa última localização salva ou fallback para Crateús/CE
    const getInitialPosition = () => {
        const saved = localStorage.getItem('hf_user_location');
        if (saved) {
            const { lat, lng } = JSON.parse(saved);
            return [lat, lng];
        }
        return [-5.1753, -40.6769]; // Crateús, CE como fallback
    };

    const initialPosition = getInitialPosition();
    const [hives, setHives] = useState([]);
    const [apiaries, setApiaries] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Carrega apiários da API
                let apiariesData = await buscarApiarios();
                console.log('📍 Apiários da API:', apiariesData);

                // Garante que é um array
                if (!Array.isArray(apiariesData)) {
                    if (apiariesData?.dados) apiariesData = apiariesData.dados;
                    else if (apiariesData?.data) apiariesData = apiariesData.data;
                    else apiariesData = [];
                }

                const processedApiaries = apiariesData.map(api => {
                    let polygon = [];
                    // Tenta carregar polígono real da Referencia, senão usa o padrão
                    if (api.localizacao?.referencia) {
                        try {
                            const parsed = JSON.parse(api.localizacao.referencia);
                            if (Array.isArray(parsed) && parsed.length >= 4) {
                                polygon = parsed;
                            }
                        } catch (e) { }
                    }

                    if (polygon.length === 0 && api.coord_X && api.coord_Y) {
                        const lat = parseFloat(api.coord_Y);
                        const lng = parseFloat(api.coord_X);
                        if (!isNaN(lat) && !isNaN(lng)) {
                            polygon = [
                                { lat: lat + 0.001, lng: lng - 0.001 },
                                { lat: lat + 0.001, lng: lng + 0.001 },
                                { lat: lat - 0.001, lng: lng + 0.001 },
                                { lat: lat - 0.001, lng: lng - 0.001 }
                            ];
                        }
                    }

                    return {
                        ...api,
                        polygon: polygon,
                        nomeApelido: api.nomeApelido || api.localizacao?.descricaoLocal || `Apiário ${api.id}`
                    };
                });

                // Filtra apiários desativados
                const activeApiaries = processedApiaries.filter(ap => ap.atividade !== 0);

                setApiaries(activeApiaries);
                console.log('✅ Apiários carregados:', activeApiaries.length);
            } catch (error) {
                console.error('❌ Erro ao carregar apiários:', error);
            }

            try {
                // Carrega colmeias da API
                let hivesData = await buscarColmeias();
                console.log('🐝 Colmeias da API:', hivesData);

                // Garante que é um array
                if (!Array.isArray(hivesData)) {
                    if (hivesData?.dados) hivesData = hivesData.dados;
                    else if (hivesData?.data) hivesData = hivesData.data;
                    else hivesData = [];
                }

                // Log detalhado de cada colmeia
                console.log(`✅ Colmeias carregadas: ${hivesData.length}`);
                hivesData.forEach((hive, idx) => {
                    console.log(`   Colmeia ${idx + 1}:`, {
                        id: hive.id,
                        apiarioId: hive.apiarioId || hive.apiario,
                        anoColmeia: hive.anoColmeia,
                        lat: hive.lat || hive.latitude,
                        lng: hive.lng || hive.longitude,
                        status: hive.status
                    });
                });

                setHives(hivesData);
            } catch (error) {
                console.error('❌ Erro ao carregar colmeias:', error);
                setHives([]);
            }
        };

        loadData();
    }, []);

    // Encontra o nome do apiário pelo ID
    const getApiaryName = (apiarioId) => {
        const apiary = apiaries.find(ap => String(ap.id) === String(apiarioId));
        return apiary ? apiary.nomeApelido : `Apiário ${apiarioId}`;
    };

    return (
        <div className="map-area-container">
            <MapContainer
                center={initialPosition}
                zoom={13}
                className="map-leaflet"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker />
                <FlyToLocation location={flyToLocation} />

                {/* Renderiza polígonos clicáveis para cada apiário */}
                {apiaries.map((apiary) => (
                    <ClickablePolygon
                        key={`apiary-${apiary.id}`}
                        apiary={apiary}
                        navigate={navigate}
                    />
                ))}

                {/* Renderiza marcadores para apiários sem polígono mas com coordenadas */}
                {apiaries.map((apiary) => (
                    <ApiaryMarker
                        key={`marker-${apiary.id}`}
                        apiary={apiary}
                        navigate={navigate}
                    />
                ))}

                {/* Renderiza marcadores para cada colmeia salva (apenas ativas) */}
                {(() => {
                    const activeHives = hives.filter(h => h.status === 1);
                    return activeHives.map((hive) => {
                        // Tenta obter as coordenadas da colmeia ou do apiário
                        const hiveLat = parseCoordinate(hive.lat || hive.latitude);
                        const hiveLng = parseCoordinate(hive.lng || hive.longitude);

                        // Se não tem coordenadas próprias, tenta usar do apiário
                        const apiarioId = hive.apiarioId || hive.apiario;
                        const apiary = apiaries.find(ap => String(ap.id) === String(apiarioId));
                        const apLat = apiary ? parseCoordinate(apiary.coord_Y || apiary.latitude) : null;
                        const apLng = apiary ? parseCoordinate(apiary.coord_X || apiary.longitude) : null;

                        let finalLat = hiveLat || apLat;
                        let finalLng = hiveLng || apLng;

                        // Validação de range
                        if (!isValidCoordinate(finalLat, finalLng)) return null;

                        // Aplica o deslocamento spider se houver múltiplas colmeias no mesmo apiário
                        const hivesInSameApiary = activeHives.filter(h => String(h.apiarioId || h.apiario) === String(apiarioId));
                        const hiveIndex = hivesInSameApiary.findIndex(h => h.id === hive.id);

                        const [jitteredLat, jitteredLng] = getSpiderOffset(finalLat, finalLng, hiveIndex, hivesInSameApiary.length);

                        return (
                            <Marker
                                key={`hive-${hive.id}`}
                                position={[jitteredLat, jitteredLng]}
                                icon={createHiveIcon()}
                                title={`Colmeia ${hive.id} - ${hive.anoColmeia}`}
                                eventHandlers={{
                                    click: () => {
                                        if (apiarioId) navigate(`/apiario/${apiarioId}`);
                                    },
                                    mouseover: (e) => e.target.openPopup(),
                                    mouseout: (e) => e.target.closePopup()
                                }}
                            >
                                <Popup>
                                    <strong>Colmeia #{hive.id}</strong><br />
                                    Apiário: {apiary?.nomeApelido || `ID ${apiarioId}`}<br />
                                    Ano: {hive.anoColmeia}<br />
                                    <em style={{ fontSize: '12px', color: '#666' }}>Clique para ver detalhes</em>
                                </Popup>
                            </Marker>
                        );
                    });
                })()}
            </MapContainer>
        </div>
    );
};

export default MapArea;