import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon } from 'lucide-react';
import '../assets/css/HiveRegistration.css';

// Components
import Navbar from '../components/Navbar';
import ActionButtons from '../components/ActionButtons';
import ToastCenter from '../components/Toast';
import CustomSelect from '../components/CustomSelect';
import CustomCalendar from '../components/CustomCalendar';

import { buscarApiarios, buscarColmeiasDoApiario, editarColmeia } from '../services/apiarioService';

const HiveDeactivation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState(null);
    const [apiaries, setApiaries] = useState([]);
    const [hives, setHives] = useState([]); // Todas as colmeias do apiário selecionado
    const [showCalendar, setShowCalendar] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const calendarRef = useRef(null);

    const [formData, setFormData] = useState({
        apiario: '',
        colmeia: '',
        razaoMotivo: '',
        dataDesativacao: new Date()
    });

    // Carrega apiários da API
    useEffect(() => {
        const loadApiaries = async () => {
            try {
                const response = await buscarApiarios();
                let apiariesData = [];
                if (Array.isArray(response)) {
                    apiariesData = response;
                } else if (response?.dados && Array.isArray(response.dados)) {
                    apiariesData = response.dados;
                }
                // Filter out inactive apiaries
                const activeApiariesData = apiariesData.filter(ap => ap.atividade !== 0);
                setApiaries(activeApiariesData);

                // Se vier da navegação (ApiaryDetails), preenche o apiário
                if (location.state?.apiarioId) {
                    setFormData(prev => ({ ...prev, apiario: String(location.state.apiarioId) }));
                }
            } catch (error) {
                console.error('Erro ao buscar apiários:', error);
                showToast('Erro ao carregar apiários', 'error');
            }
        };
        loadApiaries();
    }, [location.state]);

    // Busca colmeias quando o apiário é selecionado
    useEffect(() => {
        const loadHives = async () => {
            if (!formData.apiario) {
                setHives([]);
                return;
            }

            try {
                const response = await buscarColmeiasDoApiario(formData.apiario);
                let hivesData = [];
                if (Array.isArray(response)) {
                    hivesData = response;
                } else if (response?.dados && Array.isArray(response.dados)) {
                    hivesData = response.dados;
                }
                setHives(hivesData);

                // Se vier da navegação (ApiaryDetails) e o apiário coincidir, preenche a colmeia
                if (location.state?.colmeiaId && String(location.state.apiarioId) === String(formData.apiario)) {
                    setFormData(prev => ({ ...prev, colmeia: String(location.state.colmeiaId) }));
                }
            } catch (error) {
                console.error("Erro ao buscar colmeias:", error);
                setHives([]);
            }
        };

        loadHives();
    }, [formData.apiario, location.state]);


    const showToast = (message, type) => {
        setToast({ message, type });
    };

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleInitialSave = () => {
        if (!formData.apiario || !formData.colmeia || !formData.razaoMotivo || !formData.dataDesativacao) {
            showToast('Por favor, preencha todos os campos.', 'error');
            return;
        }
        setIsModalOpen(true);
    };

    const confirmDeactivation = async () => {
        try {
            // Verifica se a colmeia existe na lista atual
            const selectedHive = hives.find(h => String(h.id) === String(formData.colmeia));
            if (!selectedHive) {
                showToast('Colmeia inválida.', 'error');
                return;
            }

            // Payload conforme ColmeiaUpdateDTO.cs
            // Status 0 para Inativo
            const payload = {
                anoColmeia: selectedHive.anoColmeia,
                anoRainha: selectedHive.anoRainha,
                status: 0
            };

            await editarColmeia(selectedHive.id, payload);

            setIsModalOpen(false);
            showToast('Colmeia desativada com sucesso!', 'success');

            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (error) {
            console.error("Erro ao desativar colmeia:", error);
            showToast('Erro ao atualizar status da colmeia. Tente novamente.', 'error');
            setIsModalOpen(false);
        }
    };

    const handleDateChange = (date) => {
        setFormData({ ...formData, dataDesativacao: date });
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
        if (!(date instanceof Date)) return date;
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Desativar Colmeia</h1>
                    </div>
                    <ActionButtons onCancel={handleBack} onSave={handleInitialSave} />
                </div>

                <div className="reg-full-width">
                    <div className="reg-card">
                        <h2>Informações da Desativação</h2>

                        <div className="input-group">
                            <label>Apiário</label>
                            <CustomSelect
                                options={apiaries.map(ap => ({
                                    value: String(ap.id),
                                    label: ap.nomeApelido || ap.nome || `Apiário #${ap.id}`
                                }))}
                                value={formData.apiario}
                                onChange={(val) => setFormData({ ...formData, apiario: val, colmeia: '' })}
                                placeholder={apiaries.length === 0 ? "Nenhum apiário encontrado" : "Selecione o apiário"}
                            />
                        </div>

                        <div className="input-group">
                            <label>Colmeia</label>
                            <CustomSelect
                                options={hives.map(hive => ({
                                    value: String(hive.id),
                                    label: `Colmeia ${hive.anoColmeia}${hive.anoRainha ? ` - Rainha ${hive.anoRainha}` : ''}`
                                }))}
                                value={formData.colmeia}
                                onChange={(val) => setFormData({ ...formData, colmeia: val })}
                                placeholder={formData.apiario ? (hives.length === 0 ? "Nenhuma colmeia neste apiário" : "Selecione a colmeia") : "Selecione um apiário primeiro"}
                                disabled={!formData.apiario}
                            />
                        </div>

                        <div className="input-group">
                            <label>Razão/Motivo</label>
                            <input
                                type="text"
                                placeholder="Ex: Colmeia fraca, Rainha morta, etc."
                                value={formData.razaoMotivo}
                                onChange={(e) => setFormData({ ...formData, razaoMotivo: e.target.value })}
                            />
                        </div>

                        <div className="input-group" style={{ position: 'relative' }} ref={calendarRef}>
                            <label>Data da desativação</label>
                            <div
                                className="datepicker-trigger"
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                <span>{formatDate(formData.dataDesativacao)}</span>
                                <CalendarIcon size={20} color="var(--hf-primary-dark)" />
                            </div>

                            {showCalendar && (
                                <div className="datepicker-popup">
                                    <CustomCalendar
                                        value={formData.dataDesativacao}
                                        onChange={handleDateChange}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Confirmation Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '24px',
                        borderRadius: 'var(--hf-radius-md)',
                        boxShadow: 'var(--hf-shadow-lg)',
                        maxWidth: '400px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ marginBottom: '16px', color: 'var(--hf-text-main)' }}>Confirmar Desativação</h3>
                        <p style={{ marginBottom: '24px', color: 'var(--hf-text-secondary)' }}>
                            Tem certeza que deseja desativar esta colmeia? Esta ação registrará o fim do ciclo produtivo dela.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #ccc',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDeactivation}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'var(--hf-primary)',
                                    color: 'var(--hf-text-main)',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

export default HiveDeactivation;
