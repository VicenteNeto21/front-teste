import { buscarApiarios, registrarMovimentacao, buscarTiposMel } from '../services/apiarioService';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import '../assets/css/HiveRegistration.css';

// Components
import Navbar from '../components/Navbar';
import ActionButtons from '../components/ActionButtons';
import ToastCenter from '../components/Toast';
import CustomSelect from '../components/CustomSelect';
import CustomCalendar from '../components/CustomCalendar';

const LossRegistration = () => {
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);
    const [apiaries, setApiaries] = useState([]);
    const [honeyTypes, setHoneyTypes] = useState([]);
    const [formData, setFormData] = useState({
        apiarioId: '',
        volumePerdido: '',
        dataPerda: new Date(),
        razaoMotivo: '',
        tipoMel: ''
    });

    // Carrega apiários da API
    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await buscarApiarios();
                let apiariesData = [];
                if (Array.isArray(response)) {
                    apiariesData = response;
                } else if (response?.dados && Array.isArray(response.dados)) {
                    apiariesData = response.dados;
                }
                // Filter out inactive apiaries
                const activeApiaries = apiariesData.filter(ap => ap.atividade !== 0);
                setApiaries(activeApiaries);
            } catch (error) {
                console.error('Erro ao buscar apiários:', error);
                showToast('Erro ao carregar apiários', 'error');
            }
        };
        loadData();
    }, []);

    // Ao selecionar apiário, preenche tipoMel automaticamente
    useEffect(() => {
        if (!formData.apiarioId) {
            setFormData(f => ({ ...f, tipoMel: '' }));
            return;
        }
        const apiario = apiaries.find(a => String(a.id) === String(formData.apiarioId) || String(a.Id) === String(formData.apiarioId));
        const tipoMel = apiario?.TipoDeMel || apiario?.tipoDeMel || '';
        setFormData(f => ({ ...f, tipoMel }));
    }, [formData.apiarioId, apiaries]);

    const showToast = (message, type) => {
        setToast({ message, type });
    };

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleSave = async () => {
        if (!formData.apiarioId || !formData.volumePerdido || !formData.dataPerda || !formData.razaoMotivo) {
            showToast('Por favor, preencha todos os campos.', 'error');
            return;
        }

        const payload = {
            tipo: 3, // Perda
            quantidadeKg: parseFloat(formData.volumePerdido),
            valor: 0,
            data: formData.dataPerda instanceof Date ? formData.dataPerda.toISOString().split('T')[0] : formData.dataPerda,
            observacao: `Motivo: ${formData.razaoMotivo} | Tipo de mel: ${formData.tipoMel}`
        };

        try {
            const response = await registrarMovimentacao(formData.apiarioId, payload);
            if (response?.status === true) {
                showToast(response?.mensage || 'Perda registrada com sucesso!', 'success');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            } else {
                showToast(response?.mensage || 'Erro ao registrar perda.', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar perda:', error);
            showToast('Erro ao salvar os dados. Tente novamente.', 'error');
        }
    };

    const handleDateChange = (date) => {
        setFormData({ ...formData, dataPerda: date });
        setShowCalendar(false);
    };

    // Close calendar on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowCalendar(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDate = (date) => {
        return date.toLocaleDateString('pt-BR');
    };
    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Registro de Perdas</h1>
                    </div>
                    <ActionButtons onCancel={handleBack} onSave={handleSave} />
                </div>

                <div className="reg-full-width">
                    <div className="reg-card">
                        <h2>Informações da Perda</h2>

                        <div className="input-group">
                            <label>Selecione o apiário <span className="required-star">*</span></label>
                            <div className="select-with-btn">
                                <CustomSelect
                                    options={
                                        apiaries.length > 0
                                            ? apiaries.map(ap => ({
                                                value: String(ap.id),
                                                label: ap.nomeApelido || ap.nome || `Apiário #${ap.id}`
                                            }))
                                            : [{ value: '', label: 'Nenhum apiário cadastrado' }]
                                    }
                                    value={formData.apiarioId}
                                    onChange={(val) => setFormData({ ...formData, apiarioId: val })}
                                    placeholder={apiaries.length === 0 ? 'Nenhum apiário cadastrado' : 'Selecione o apiário'}
                                    disabled={apiaries.length === 0}
                                />
                                <button className="add-apiary-btn" onClick={() => navigate('/cadastro-apiario')}>+</button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Volume perdido (Kg) <span className="required-star">*</span></label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.volumePerdido}
                                onChange={(e) => setFormData({ ...formData, volumePerdido: e.target.value })}
                            />
                        </div>

                        <div className="input-group">
                            <label>Tipo de mel <span className="required-star">*</span></label>
                            <input
                                type="text"
                                value={formData.tipoMel}
                                readOnly
                                disabled
                                placeholder="Tipo de mel do apiário"
                            />
                        </div>

                        <div className="input-group" style={{ position: 'relative' }} ref={calendarRef}>
                            <label>Data da perda <span className="required-star">*</span></label>
                            <div
                                className="datepicker-trigger"
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                <span>{formatDate(formData.dataPerda)}</span>
                                <CalendarIcon size={20} color="var(--hf-primary-dark)" />
                            </div>

                            {showCalendar && (
                                <div className="datepicker-popup">
                                    <CustomCalendar
                                        value={formData.dataPerda}
                                        onChange={handleDateChange}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label>Razão/Motivo <span className="required-star">*</span></label>
                            <input
                                type="text"
                                placeholder="Ex: Quebra de pote, Formigas, etc."
                                value={formData.razaoMotivo}
                                onChange={(e) => setFormData({ ...formData, razaoMotivo: e.target.value })}
                            />
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

export default LossRegistration;