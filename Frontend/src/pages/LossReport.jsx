import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import '../assets/css/HiveRegistration.css';
import '../assets/css/Reports.css';

// Components
import Navbar from '../components/Navbar';
import CustomSelect from '../components/CustomSelect';
import ToastCenter from '../components/Toast';

// Services
import { buscarApiarios, buscarGraficoMensal } from '../services/apiarioService';

const LossReport = () => {
    const navigate = useNavigate();
    const [filterType, setFilterType] = useState('honey'); // 'honey' filter visual only for now, chart is backend driven
    const [periodo, setPeriodo] = useState('ano');
    const [ano, setAno] = useState(new Date().getFullYear().toString());
    const [apiarioId, setApiarioId] = useState('');
    const [apiarios, setApiarios] = useState([]);
    const [lossData, setLossData] = useState([]);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);

    const periodOptions = [
        { value: 'ano', label: 'Anual' }
    ];

    const yearOptions = [
        { value: '2026', label: '2026' },
        { value: '2025', label: '2025' },
        { value: '2024', label: '2024' }
    ];

    const showToast = (message, type) => {
        setToast({ message, type });
    };

    // 1. Carregar Apiários (apenas ativos)
    useEffect(() => {
        const loadApiarios = async () => {
            try {
                const res = await buscarApiarios();
                const arr = Array.isArray(res) ? res : (res?.dados || []);

                // Filtra apiários desativados
                const activeApiaries = arr.filter(ap => ap.atividade !== 0);

                setApiarios(activeApiaries);

                if (activeApiaries.length > 0) {
                    setApiarioId(String(activeApiaries[0].id));
                }
            } catch (error) {
                console.error("Erro ao carregar apiários:", error);
                showToast("Erro ao carregar lista de apiários", "error");
            }
        };
        loadApiarios();
    }, []);

    // 2. Buscar Dados do Gráfico Backend-First
    useEffect(() => {
        if (!apiarioId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Chama endpoint que já retorna dados agregados
                const res = await buscarGraficoMensal(apiarioId, ano);
                const dados = Array.isArray(res) ? res : (res?.dados || []);

                // Mapeia diretamente os dados retornados pela API
                // O backend retorna: { nomeMes, totalPerdaKg, ... }
                const chartData = dados.map(item => ({
                    name: item.nomeMes ? item.nomeMes.substring(0, 3) : `Mês ${item.mes}`, // Abrevia mês
                    valor: item.totalPerdaKg || 0
                }));

                setLossData(chartData);
            } catch (error) {
                console.error("Erro ao carregar relatório de perdas:", error);
                showToast("Erro ao buscar dados do gráfico.", "error");
                setLossData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiarioId, ano]);

    const handleBack = () => {
        navigate('/dashboard');
    };

    // Prepara opções para o Select de Apiários
    const apiaryOptions = apiarios.map(api => ({
        value: String(api.id),
        label: api.nomeApelido || `Apiário ${api.id}`
    }));

    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Relatório de Perdas</h1>
                        <p className="subtitle">Visualização anual de perdas por apiário</p>
                    </div>
                    <div className="action-buttons-container">
                        <button className="btn-action btn-cancel-action" onClick={handleBack}>
                            <ArrowLeft size={18} />
                            Voltar
                        </button>
                    </div>
                </div>

                <div className="loss-report-filters-container">
                    <div className="filter-header-label">Filtros do Relatório</div>

                    <div className="filter-inputs-row">
                        <div className="filter-col">
                            <label>Apiário</label>
                            <CustomSelect
                                options={apiaryOptions}
                                value={apiarioId}
                                onChange={setApiarioId}
                                placeholder="Selecione um apiário"
                            />
                        </div>
                        <div className="filter-col">
                            <label>Ano</label>
                            <CustomSelect
                                options={yearOptions}
                                value={ano}
                                onChange={setAno}
                            />
                        </div>
                        <div className="filter-col">
                            <label>Período</label>
                            <CustomSelect
                                options={periodOptions}
                                value={periodo}
                                onChange={setPeriodo}
                            />
                        </div>
                    </div>
                </div>

                <div className="loss-chart-container">
                    {loading ? (
                        <div className="chart-loading">
                            Carregando dados reais do servidor...
                        </div>
                    ) : lossData.length === 0 ? (
                        <div className="chart-empty">
                            Nenhum dado encontrado para o período.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={lossData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#E0E0E0"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="name"
                                    axisLine={{ stroke: '#666', strokeWidth: 1 }}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#666', fontSize: 12 }}
                                    tickFormatter={(value) => `${value}kg`}
                                    label={{ value: 'Perda (Kg)', angle: -90, position: 'insideLeft', style: { fill: '#666' } }}
                                />
                                <Tooltip
                                    formatter={(value) => [`${value} kg`, 'Total Perda']}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                    cursor={{ fill: 'rgba(255, 77, 77, 0.1)' }}
                                />
                                <Bar
                                    dataKey="valor"
                                    fill="#ff4d4d"
                                    radius={[4, 4, 0, 0]}
                                    barSize={40}
                                    name="Perda"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
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

export default LossReport;
