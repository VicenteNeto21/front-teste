import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import '../assets/css/HiveRegistration.css';
import '../assets/css/Reports.css';
import { buscarApiarios, buscarProducaoDoApiario } from '../services/apiarioService';
import Navbar from '../components/Navbar';
import CustomSelect from '../components/CustomSelect';
import ToastCenter from '../components/Toast';

const SalesReport = () => {
    const navigate = useNavigate();
    const [apiarios, setApiarios] = useState([]);
    const [apiarioId, setApiarioId] = useState('');
    const [periodo, setPeriodo] = useState('ano');
    const [ano, setAno] = useState(new Date().getFullYear().toString());
    const [mes, setMes] = useState((new Date().getMonth() + 1).toString());
    const [semana, setSemana] = useState('1');
    const [salesData, setSalesData] = useState([]);
    const [priceData, setPriceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const periodOptions = [
        { value: 'ano', label: 'Anual' },
        // { value: 'mes', label: 'Mensal' }, // Adicionar suporte depois se necessário
        // { value: 'semana', label: 'Semanal' }
    ];

    const yearOptions = [
        { value: '2026', label: '2026' },
        { value: '2025', label: '2025' },
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' }
    ];

    const showToast = (message, type) => {
        setToast({ message, type });
    };

    // Busca apiários ao carregar (somente ativos)
    useEffect(() => {
        const loadApiarios = async () => {
            try {
                const res = await buscarApiarios();
                let arr = [];
                if (Array.isArray(res)) arr = res;
                else if (res?.dados && Array.isArray(res.dados)) arr = res.dados;

                // Filter out inactive apiaries
                const activeApiaries = arr.filter(ap => ap.atividade !== 0);

                setApiarios(activeApiaries);
                if (activeApiaries.length > 0 && !apiarioId) setApiarioId(String(activeApiaries[0].id));
            } catch (error) {
                console.error("Erro ao carregar apiários:", error);
                showToast("Erro ao carregar lista de apiários.", "error");
            }
        };
        loadApiarios();
    }, []);

    // Busca dados de vendas quando apiarioId, ano ou periodo mudam
    useEffect(() => {
        const fetchSalesData = async () => {
            if (!apiarioId) return;

            setLoading(true);
            try {
                const prodRes = await buscarProducaoDoApiario(apiarioId);
                const dados = Array.isArray(prodRes) ? prodRes : (prodRes?.dados || []);

                // Filtra por Vendas (Tipo 2) e Ano
                const validSales = dados.filter(m => {
                    if (m.tipo !== 2) return false;
                    const dataMov = m.data ? new Date(m.data) : null;
                    if (!dataMov) return false;
                    return dataMov.getFullYear().toString() === ano;
                });

                // Agrega por mês
                const monthlySales = Array(12).fill(0).map((_, i) => ({
                    name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }),
                    index: i + 1,
                    valor: 0, // Valor em R$
                    volume: 0, // Volume em Kg
                    count: 0
                }));

                validSales.forEach(sale => {
                    const date = new Date(sale.data);
                    const monthIndex = date.getMonth();
                    monthlySales[monthIndex].valor += (sale.valor || 0);
                    monthlySales[monthIndex].volume += (sale.quantidadeKg || 0);
                    monthlySales[monthIndex].count += 1;
                });

                // Prepara dados para os gráficos
                // Gráfico 1: Vendas Totais (R$)
                // Nota: O label Y está 'Volume (L)', mas o título é 'Vendas (R$)'. Vamos corrigir o label Y para R$.
                const chart1Data = monthlySales.map(m => ({
                    name: m.name,
                    valor: m.valor
                }));

                // Gráfico 2: Preço Médio por Litro/Kg (R$/Kg)
                const chart2Data = monthlySales.map(m => ({
                    name: m.name,
                    valor: m.volume > 0 ? parseFloat((m.valor / m.volume).toFixed(2)) : 0
                }));

                setSalesData(chart1Data);
                setPriceData(chart2Data);

            } catch (error) {
                console.error("Erro ao carregar vendas:", error);
                showToast("Erro ao carregar dados de vendas.", "error");
            } finally {
                setLoading(false);
            }
        };

        if (periodo === 'ano') {
            fetchSalesData();
        }
    }, [apiarioId, ano, periodo]);

    const handleBack = () => {
        navigate('/dashboard');
    };

    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Relatório de Vendas</h1>
                    </div>
                    <div className="action-buttons-container">
                        <button className="btn-action btn-cancel-action" onClick={handleBack}>
                            <ArrowLeft size={18} />
                            Voltar
                        </button>
                    </div>
                </div>

                <div className="report-filters">
                    <div className="filter-group full-width">
                        <label>Selecione o apiário</label>
                        <CustomSelect
                            options={apiarios.map(a => ({ value: String(a.id), label: a.localizacao?.descricaoLocal || a.nomeApelido || `Apiário #${a.id}` }))}
                            value={apiarioId}
                            onChange={setApiarioId}
                            placeholder="Selecione o apiário"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Período</label>
                        <CustomSelect
                            options={periodOptions}
                            value={periodo}
                            onChange={setPeriodo}
                            placeholder="Selecione o período"
                        />
                    </div>
                    <div className="filter-group">
                        <label>Ano</label>
                        <CustomSelect
                            options={yearOptions}
                            value={ano}
                            onChange={setAno}
                            placeholder="Selecione o ano"
                        />
                    </div>
                </div>

                <div className="charts-grid">
                    <div className="chart-card">
                        <h3 className="chart-title">Vendas (R$)</h3>
                        {loading ? <div style={{ textAlign: 'center', padding: '50px' }}>Carregando...</div> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={salesData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#E0E0E0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={{ stroke: '#666', strokeWidth: 2 }}
                                        tickLine={{ stroke: '#666' }}
                                        tick={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                                        dy={10}
                                        label={{ value: 'Mês', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600, fill: '#333' } }}
                                    />
                                    <YAxis
                                        axisLine={{ stroke: '#666', strokeWidth: 2 }}
                                        tickLine={{ stroke: '#666' }}
                                        tick={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                                        tickFormatter={(value) => `R$${value}`}
                                        dx={-10}
                                        label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600, fill: '#333', textAnchor: 'middle' } }}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`R$ ${value}`, 'Vendas']}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                        labelStyle={{ fontWeight: 600, color: '#333' }}
                                    />
                                    <Bar
                                        dataKey="valor"
                                        fill="#4dd0e1"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={60}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="chart-card">
                        <h3 className="chart-title">Preço Médio (R$/Kg)</h3>
                        {loading ? <div style={{ textAlign: 'center', padding: '50px' }}>Carregando...</div> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={priceData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#E0E0E0"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={{ stroke: '#666', strokeWidth: 2 }}
                                        tickLine={{ stroke: '#666' }}
                                        tick={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                                        dy={10}
                                        label={{ value: 'Mês', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600, fill: '#333' } }}
                                    />
                                    <YAxis
                                        axisLine={{ stroke: '#666', strokeWidth: 2 }}
                                        tickLine={{ stroke: '#666' }}
                                        tick={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                                        tickFormatter={(value) => `R$${value}`}
                                        dx={-10}
                                        label={{ value: 'Preço (R$/Kg)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600, fill: '#333', textAnchor: 'middle' } }}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`R$ ${value}/Kg`, 'Preço Médio']}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                        }}
                                        labelStyle={{ fontWeight: 600, color: '#333' }}
                                    />
                                    <Bar
                                        dataKey="valor"
                                        fill="#ffbd59"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={60}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
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

export default SalesReport;
