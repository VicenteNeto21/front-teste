import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { buscarApiarios, criarColmeia } from '../services/apiarioService';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../assets/css/HiveRegistration.css';

// Components
import Navbar from '../components/Navbar';
import ActionButtons from '../components/ActionButtons';
import ToastCenter from '../components/Toast';
import CustomSelect from '../components/CustomSelect';
import { createHiveIcon } from '../components/HiveMarker';

// Custom Marker Icon
const customIcon = createHiveIcon();

// Função para verificar se um ponto está dentro de um polígono (Ray-casting algorithm)
const isPointInPolygon = (point, polygon) => {
    if (!polygon || polygon.length < 3) return false;

    const x = point.lat;
    const y = point.lng;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;

        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

const LocationPicker = ({ onLocationSelect, apiaryPolygon, showError }) => {
    const [position, setPosition] = useState(null);
    const [hasLocated, setHasLocated] = useState(false);
    const map = useMap();

    useEffect(() => {
        if (!hasLocated) {
            map.locate().on("locationfound", function (e) {
                // Apenas centraliza o mapa na localização do usuário
                // NÃO seleciona automaticamente - usuário precisa clicar
                map.flyTo(e.latlng, 15);
                setHasLocated(true);
            });
        }
    }, [map, hasLocated]);

    useMapEvents({
        click(e) {
            // Verifica se o clique está dentro do polígono do apiário
            if (apiaryPolygon && apiaryPolygon.length > 0) {
                const clickedPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
                if (!isPointInPolygon(clickedPoint, apiaryPolygon)) {
                    showError('A colmeia deve ser posicionada dentro da área do apiário!');
                    return;
                }
            }
            // Somente quando o usuário clica dentro da área é que define a posição
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker position={position} icon={customIcon} />
    );
};

// Helper para converter string numérica em float
const parseCoordinate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return isNaN(value) ? null : value;

    const str = String(value).trim();
    if (str === '' || str === 'Não informado' || str === 'null' || str === 'undefined') return null;

    const num = parseFloat(str);
    return isNaN(num) ? null : num;
};

// Helper para validar coordenadas
const isValidCoordinate = (lat, lng) => {
    return lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

// Componente para centralizar no polígono ou coordenadas do apiário selecionado
const FlyToApiary = ({ apiary }) => {
    const map = useMap();

    useEffect(() => {
        if (!apiary) return;

        // Se tem polígono válido, usa os bounds
        if (apiary.polygon && apiary.polygon.length > 0) {
            try {
                const bounds = L.latLngBounds(apiary.polygon.map(p => [p.lat, p.lng]));
                map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
                return;
            } catch (e) {
                console.warn("Erro ao processar polígono:", e);
            }
        }

        // Se não tem polígono, tenta usar as coordenadas diretas
        const lat = parseCoordinate(apiary.coord_Y || apiary.latitude);
        const lng = parseCoordinate(apiary.coord_X || apiary.longitude);

        if (isValidCoordinate(lat, lng)) {
            map.flyTo([lat, lng], 15, { duration: 1 });
        }
    }, [apiary, map]);

    return null;
};

const HiveRegistration = () => {
    const navigate = useNavigate();
    const [coords, setCoords] = useState({ lat: '', lng: '' });
    const [toast, setToast] = useState(null);
    const [apiaries, setApiaries] = useState([]);
    const [selectedApiary, setSelectedApiary] = useState(null);
    const [honeyTypes, setHoneyTypes] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        apiario: '',
        anoColmeia: '',
        anoRainha: '',
        tipoMel: ''
    });

    const location = useLocation();

    // Carrega apiários da API
    useEffect(() => {
        const loadApiarios = async () => {
            try {
                let data = await buscarApiarios();
                console.log("Apiários carregados:", data);

                // Garante que data é um array
                if (!Array.isArray(data)) {
                    // Tenta ver se veio envelopado em alguma propriedade
                    if (data && Array.isArray(data.dados)) {
                        data = data.dados;
                    } else if (data && Array.isArray(data.data)) {
                        data = data.data;
                    } else if (data && Array.isArray(data.value)) { // OData ou similar
                        data = data.value;
                    } else {
                        console.warn("A resposta da API não é um array:", data);
                        data = [];
                    }
                }
                // A API pode retornar apiários sem polígono.
                // Tentamos recuperar o polígono desenhado do localStorage.

                // Filter out inactive apiaries
                const activeApiariesData = data.filter(api => api.atividade !== 0);

                // Mapeia para adicionar polígono visual se tiver coordenadas
                const apiariosComPoligono = activeApiariesData.map(api => {
                    let polygon = [];
                    // Como a API só retorna ponto central, criamos um quadrado padrão para visualização
                    if (api.coord_X && api.coord_Y) {
                        const lat = parseFloat(api.coord_Y);
                        const lng = parseFloat(api.coord_X);
                        // Verifica se são números válidos
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
                        nomeApelido: api.localizacao?.descricaoLocal || 'Apiário sem nome'
                    };
                });

                setApiaries(apiariosComPoligono);
            } catch (error) {
                console.error("Erro ao buscar apiários:", error);
                showToast("Erro ao carregar lista de apiários.", "error");
            }
        };

        loadApiarios();

        // Tipos de mel padrão para sugestão
        const defaultHoneyTypes = ["Silvestre", "Eucalipto", "Laranjeira", "Jataí", "Mandaçaia"];
        setHoneyTypes(defaultHoneyTypes);

        // Preenche o apiário se vier da navegação (após cadastro de apiário)
        if (location.state?.apiarioId) {
            setFormData(prev => ({ ...prev, apiario: String(location.state.apiarioId) }));
        }
    }, [location.state]);

    // Atualiza o apiário selecionado quando formData.apiario muda
    useEffect(() => {
        if (formData.apiario && apiaries.length > 0) {
            const selected = apiaries.find(ap => String(ap.id) === String(formData.apiario));
            setSelectedApiary(selected || null);

            if (selected) {
                // Preenche os campos de coordenadas se disponíveis
                const lat = parseCoordinate(selected.coord_Y || selected.latitude);
                const lng = parseCoordinate(selected.coord_X || selected.longitude);

                if (isValidCoordinate(lat, lng)) {
                    setCoords({
                        lat: lat.toFixed(6),
                        lng: lng.toFixed(6)
                    });
                    console.log(`✅ Apiário "${selected.nomeApelido}" selecionado: [${lat}, ${lng}]`);
                } else {
                    console.warn(`⚠️ Apiário "${selected.nomeApelido}" sem coordenadas válidas`);
                    setCoords({ lat: '', lng: '' });
                }
            }
        } else {
            setSelectedApiary(null);
            setCoords({ lat: '', lng: '' });
        }
    }, [formData.apiario, apiaries]);

    const showToast = (message, type) => {
        setToast({ message, type });
    };

    const handleLocationSelect = (lat, lng) => {
        setCoords({ lat: lat.toFixed(6), lng: lng.toFixed(6) });
    };

    // Handler para input de tipo de mel com autocomplete
    const handleHoneyTypeChange = (value) => {
        setFormData({ ...formData, tipoMel: value });

        if (value.trim().length > 0) {
            const filtered = honeyTypes.filter(type =>
                type.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    // Seleciona uma sugestão
    const handleSelectSuggestion = (type) => {
        setFormData({ ...formData, tipoMel: type });
        setShowSuggestions(false);
    };

    const handleBack = () => {
        navigate('/dashboard');
    };


    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        // Validação de campos obrigatórios
        if (!formData.apiario) {
            showToast('Por favor, selecione um apiário.', 'error');
            return;
        }
        if (!formData.anoColmeia) {
            showToast('Por favor, informe o ano da colmeia.', 'error');
            return;
        }

        const payload = {
            ApiarioId: parseInt(formData.apiario),
            AnoColmeia: parseInt(formData.anoColmeia),
            AnoRainha: parseInt(formData.anoRainha) || parseInt(formData.anoColmeia),
            Status: 1 // Ativa
        };

        try {
            setLoading(true);
            await criarColmeia(payload);

            showToast('Colmeia cadastrada com sucesso!', 'success');

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (error) {
            console.error("Erro ao salvar colmeia:", error);
            showToast('Erro ao salvar colmeia na API.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Cadastro de colmeia</h1>
                    </div>
                    <ActionButtons onCancel={handleBack} onSave={handleSave} loading={loading} disabled={apiaries.length === 0 || !coords.lat || !coords.lng} />
                </div>

                <div className="reg-grid">
                    {/* Left Column: General Info */}
                    <div className="reg-card card-info">
                        <h2>Informações gerais</h2>
                        <div className="input-group">
                            <label>Selecione o apiário <span style={{ color: 'red' }}>*</span></label>
                            <div className="select-with-btn">
                                <CustomSelect
                                    options={
                                        apiaries.length > 0
                                            ? apiaries.map(ap => ({
                                                value: String(ap.id),
                                                label: ap.nomeApelido
                                            }))
                                            : [{ value: '', label: 'Nenhum apiário cadastrado' }]
                                    }
                                    value={formData.apiario}
                                    onChange={(val) => setFormData({ ...formData, apiario: val })}
                                    placeholder={apiaries.length === 0 ? 'Nenhum apiário cadastrado' : 'Selecione o apiário'}
                                    disabled={apiaries.length === 0}
                                />
                                <button className="add-apiary-btn" onClick={() => navigate('/cadastro-apiario')}>+</button>
                                {apiaries.length === 0 && (
                                    <div style={{ color: '#b91c1c', marginTop: 8 }}>
                                        Cadastre um apiário antes de criar colmeias.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Ano da colmeia <span className="required-star">*</span></label>
                            <input
                                type="text"
                                placeholder=""
                                value={formData.anoColmeia}
                                onChange={(e) => setFormData({ ...formData, anoColmeia: e.target.value })}
                            />
                        </div>

                        <div className="input-group">
                            <label>Ano da rainha <span className="required-star">*</span></label>
                            <input
                                type="text"
                                placeholder=""
                                value={formData.anoRainha}
                                onChange={(e) => setFormData({ ...formData, anoRainha: e.target.value })}
                            />
                        </div>

                        <div className="input-group autocomplete-container">
                            <label>Tipo de mel <span className="required-star">*</span></label>
                            <input
                                type="text"
                                placeholder="Digite ou selecione o tipo de mel"
                                value={formData.tipoMel}
                                onChange={(e) => handleHoneyTypeChange(e.target.value)}
                                onFocus={() => {
                                    if (formData.tipoMel.trim().length > 0) {
                                        setShowSuggestions(true);
                                    }
                                }}
                                onBlur={() => {
                                    // Delay para permitir clique nas sugestões
                                    setTimeout(() => setShowSuggestions(false), 200);
                                }}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="suggestions-dropdown">
                                    {suggestions.map((type, index) => (
                                        <div
                                            key={index}
                                            className="suggestion-item"
                                            onClick={() => handleSelectSuggestion(type)}
                                        >
                                            {type}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Location */}
                    <div className="reg-card card-location">
                        <h2>Localização <span style={{ color: 'red' }}>*</span></h2>
                        <div className="map-picker-container">
                            <label>Selecione a localização no mapa <span className="required-star">*</span></label>
                            <div className="mini-map-wrapper">
                                <MapContainer center={[-23.5505, -46.6333]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <LocationPicker
                                        onLocationSelect={handleLocationSelect}
                                        apiaryPolygon={selectedApiary?.polygon}
                                        showError={(msg) => showToast(msg, 'error')}
                                    />
                                    <FlyToApiary apiary={selectedApiary} />

                                    {/* Mostra o polígono do apiário selecionado */}
                                    {selectedApiary && selectedApiary.polygon && selectedApiary.polygon.length > 0 && (
                                        <Polygon
                                            positions={selectedApiary.polygon.map(p => [p.lat, p.lng])}
                                            pathOptions={{
                                                color: '#ffbd59',
                                                fillColor: '#ffbd59',
                                                fillOpacity: 0.2,
                                                weight: 2
                                            }}
                                        />
                                    )}
                                </MapContainer>
                            </div>
                        </div>

                        <div className="coords-row">
                            <div className="input-group">
                                <label>Longitude</label>
                                <div className="coord-input">
                                    <span>X:</span>
                                    <input type="text" value={coords.lng} readOnly />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Latitude</label>
                                <div className="coord-input">
                                    <span>Y:</span>
                                    <input type="text" value={coords.lat} readOnly />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Toast Notification */}
            {toast && (
                <div className="toast-center-container">
                    <ToastCenter
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}
        </div>
    );
};

export default HiveRegistration;
