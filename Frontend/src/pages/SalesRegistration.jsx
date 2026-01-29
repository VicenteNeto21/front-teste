import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import '../assets/css/HiveRegistration.css';

// Components
import Navbar from '../components/Navbar';
import ActionButtons from '../components/ActionButtons';
import ToastCenter from '../components/Toast';
import CustomSelect from '../components/CustomSelect';
import CustomCalendar from '../components/CustomCalendar';
import { buscarApiarios, registrarMovimentacao, buscarTiposMel } from '../services/apiarioService';

const SalesRegistration = () => {
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [apiaries, setApiaries] = useState([]);
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);
    const [honeyTypes, setHoneyTypes] = useState([]);
    const [formData, setFormData] = useState({
        apiarioId: '',
        volumeVendido: '',
        valorTotal: '',
        dataVenda: new Date(),
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
        if (!formData.apiarioId || !formData.volumeVendido || !formData.valorTotal || !formData.dataVenda) {
            showToast('Por favor, preencha todos os campos.', 'error');
            return;
        }

        const payload = {
            tipo: 2, // Venda
            quantidadeKg: parseFloat(formData.volumeVendido),
            valor: parseFloat(formData.valorTotal),
            data: formData.dataVenda instanceof Date ? formData.dataVenda.toISOString().split('T')[0] : formData.dataVenda,
            observacao: `Tipo de mel: ${formData.tipoMel}`
        };

        try {
            setLoading(true);
            const response = await registrarMovimentacao(formData.apiarioId, payload);
            if (response?.status === true) {
                showToast(response?.mensage || 'Venda registrada com sucesso!', 'success');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            } else {
                showToast(response?.mensage || 'Erro ao registrar venda. Verifique se há estoque.', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar venda:', error);
            showToast('Erro ao salvar os dados. Tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (date) => {
        setFormData({ ...formData, dataVenda: date });
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
                        <h1>Registro de Vendas</h1>
                    </div>
                    <ActionButtons onCancel={handleBack} onSave={handleSave} loading={loading} />
                </div>

                <div className="reg-full-width">
                    <div className="reg-card">
                        <h2>Informações gerais</h2>

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
                            <label>Volume vendido (Kg) <span className="required-star">*</span></label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.volumeVendido}
                                onChange={(e) => setFormData({ ...formData, volumeVendido: e.target.value })}
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

                        <div className="input-group">
                            <label>Valor total da venda (R$) <span className="required-star">*</span></label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.valorTotal}
                                onChange={(e) => setFormData({ ...formData, valorTotal: e.target.value })}
                            />
                        </div>

                        <div className="input-group" style={{ position: 'relative' }} ref={calendarRef}>
                            <label>Data da venda <span className="required-star">*</span></label>
                            <div
                                className="datepicker-trigger"
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                <span>{formatDate(formData.dataVenda)}</span>
                                <CalendarIcon size={20} color="var(--hf-primary-dark)" />
                            </div>

                            {showCalendar && (
                                <div className="datepicker-popup">
                                    <CustomCalendar
                                        value={formData.dataVenda}
                                        onChange={handleDateChange}
                                    />
                                </div>
                            )}
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

export default SalesRegistration;