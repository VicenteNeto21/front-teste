import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Loader2 } from 'lucide-react';
import '../assets/css/HiveRegistration.css';
import '../assets/css/Reports.css';

// Components
import Navbar from '../components/Navbar';
import CustomSelect from '../components/CustomSelect';
import { buscarApiarios, buscarProducaoDoApiario } from '../services/apiarioService';

const ApiaryPerformance = () => {
    const navigate = useNavigate();
    const [apiaries, setApiaries] = useState([]);
    const [selectedApiary, setSelectedApiary] = useState('');
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({
        producao: 0,
        estoque: 0,
        venda: 0
    });

    const [period, setPeriod] = useState('Anual');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
    const [category, setCategory] = useState('producao'); // 'producao', 'produtividade', 'financeiro'

    // Carrega apiários da API
    useEffect(() => {
        const loadApiaries = async () => {
            try {
                setLoading(true);
                const response = await buscarApiarios();
                const data = Array.isArray(response) ? response : (response?.dados || []);
                setApiaries(data);

                if (data.length > 0) {
                    setSelectedApiary(String(data[0].id));
                }
            } catch (error) {
                console.error("Erro ao buscar apiários:", error);
            } finally {
                setLoading(false);
            }
        };
        loadApiaries();
    }, []);

    // Carrega dados de produção quando seleciona apiário
    useEffect(() => {
        if (!selectedApiary) return;

        const loadProduction = async () => {
            try {
                setLoading(true);

                const producaoData = await buscarProducaoDoApiario(selectedApiary);
                console.log('[DEBUG] Resposta bruta buscarProducaoDoApiario:', producaoData);
                let realTotals = { producao: 0, estoque: 0, venda: 0 };
                let chart = [];
                if (producaoData && producaoData.dados) {
                    const d = producaoData.dados;
                    // Corrige para aceitar tanto totalVendido quanto totalVendidoKg
                    const totalVendido =
                        d.totalVendido !== undefined ? d.totalVendido :
                            d.totalVendidoKg !== undefined ? d.totalVendidoKg : 0;
                    realTotals = {
                        producao: d.totalProduzidoKg || 0,
                        estoque: d.estoqueAtualKg || 0,
                        venda: totalVendido
                    };
                    chart = [
                        { name: 'Total', valor: d.totalProduzidoKg || 0 }
                    ];
                }
                setTotals(realTotals);
                setChartData(chart);

            } catch (error) {
                console.warn("Erro ao buscar produção:", error);
                setTotals({ producao: 0, estoque: 0, venda: 0 });
                setChartData([]);
            } finally {
                // Simula delay para UX
                setTimeout(() => setLoading(false), 500);
            }
        };

        loadProduction();
    }, [selectedApiary, period, year, month, category]); // Recarrega se filtros mudarem (mesmo que API não suporte ainda, mantém a UX)

    const handleBack = () => {
        navigate('/dashboard');
    };

    const apiaryOptions = apiaries.length > 0
        ? apiaries.map(ap => ({
            value: String(ap.id),
            label: ap.localizacao?.descricaoLocal || ap.nome || `Apiário ${ap.id}`
        }))
        : [{ value: '', label: 'Apiário 1' }];

    // Opções de filtros visuais (apenas UI por enquanto)
    const periodOptions = [
        { value: 'Anual', label: 'Anual' },
        { value: 'Mensal', label: 'Mensal' }
    ];

    // Opções dinâmicas de ano e mês, baseadas nos dados de produção
    const [yearOptions, setYearOptions] = useState([]);
    const [monthOptions, setMonthOptions] = useState([]);

    // Atualiza opções de ano e mês sempre que chartData mudar
    useEffect(() => {
        // Extrai anos e meses únicos dos dados de produção
        let anos = new Set();
        let meses = new Set();
        if (Array.isArray(chartData)) {
            chartData.forEach(item => {
                // name pode ser ano ou mês dependendo do filtro
                if (period === 'Anual') {
                    if (item.name && !isNaN(item.name)) anos.add(item.name);
                } else {
                    if (item.name && !isNaN(item.name)) meses.add(item.name);
                }
            });
        }
        // Se não houver dados, usa o ano atual
        if (anos.size === 0) anos.add(new Date().getFullYear().toString());
        if (meses.size === 0) for (let i = 1; i <= 12; i++) meses.add(i.toString());

        setYearOptions(Array.from(anos).sort((a, b) => b - a).map(y => ({ value: String(y), label: String(y) })));
        setMonthOptions(Array.from(meses).sort((a, b) => a - b).map(m => ({
            value: String(m), label: [
                '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][parseInt(m)] || m
        })));
    }, [chartData, period]);

    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Desempenho de apiário</h1>
                    </div>
                    <div className="action-buttons-container">
                        <button className="btn-action btn-cancel-action" onClick={handleBack}>
                            <ArrowLeft size={18} />
                            Voltar
                        </button>
                    </div>
                </div>

                <div className="report-filters-full">
                    <div className="filter-row">
                        <div className="filter-group full-width">
                            <label>Selecione o apiário</label>
                            <CustomSelect
                                options={apiaryOptions}
                                value={selectedApiary}
                                onChange={setSelectedApiary}
                                placeholder="Selecione o apiário"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Período</label>
                            <CustomSelect
                                options={periodOptions}
                                value={period}
                                onChange={setPeriod}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Ano</label>
                            <CustomSelect
                                options={yearOptions}
                                value={year}
                                onChange={setYear}
                            />
                        </div>
                        {period === 'Mensal' && (
                            <div className="filter-group">
                                <label>Mês</label>
                                <CustomSelect
                                    options={monthOptions}
                                    value={month}
                                    onChange={setMonth}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="category-tabs">
                    <button
                        className={`tab-btn ${category === 'producao' ? 'active' : ''}`}
                        onClick={() => setCategory('producao')}
                    >
                        Produção
                    </button>
                    <button
                        className={`tab-btn ${category === 'produtividade' ? 'active' : ''}`}
                        onClick={() => setCategory('produtividade')}
                    >
                        Produtividade
                    </button>
                    <button
                        className={`tab-btn ${category === 'financeiro' ? 'active' : ''}`}
                        onClick={() => setCategory('financeiro')}
                    >
                        Financeiro
                    </button>
                </div>

                {/* Card de Totalização */}
                <div style={{ padding: '0 20px', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ background: '#fff', padding: '15px 20px', borderRadius: '8px', border: '1px solid #E0E0E0', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Produzido</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71' }}>{totals.producao.toFixed(1)} Kg</div>
                    </div>
                    <div style={{ background: '#fff', padding: '15px 20px', borderRadius: '8px', border: '1px solid #E0E0E0', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Estoque Atual</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totals.estoque.toFixed(1)} Kg</div>
                    </div>
                    <div style={{ background: '#fff', padding: '15px 20px', borderRadius: '8px', border: '1px solid #E0E0E0', minWidth: '200px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Vendido</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>R$ {totals.venda.toFixed(2)}</div>
                    </div>
                    {loading && (
                        <div style={{ display: 'flex', alignItems: 'center', color: '#f59e0b', gap: '8px' }}>
                            <Loader2 className="animate-spin" size={20} />
                            <span>Carregando dados...</span>
                        </div>
                    )}
                </div>

                <div className="chart-full">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 70, bottom: 60 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#E0E0E0"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                                axisLine={{ stroke: '#666', strokeWidth: 2 }}
                                tickLine={{ stroke: '#666' }}
                            />
                            <YAxis
                                axisLine={{ stroke: '#666', strokeWidth: 2 }}
                                tickLine={{ stroke: '#666' }}
                                tick={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                                label={{
                                    value: 'Valor',
                                    angle: -90,
                                    position: 'outside',
                                    dx: -50,
                                    style: { fontSize: 14, fontWeight: 600, fill: '#333', textAnchor: 'middle' }
                                }}
                            />
                            <Tooltip
                                formatter={(value) => [
                                    typeof value === 'number' ? value.toFixed(2) : value,
                                    'Valor'
                                ]}
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
                                fill="#2ecc71"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={100}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div >
            </main >
        </div >
    );
};

export default ApiaryPerformance;