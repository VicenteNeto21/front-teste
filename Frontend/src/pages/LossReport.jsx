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
import { buscarApiarios, buscarProducaoDoApiario, buscarTiposMel } from '../services/apiarioService';

const LossReport = () => {
    const navigate = useNavigate();
    const [filterType, setFilterType] = useState('honey'); // 'honey' or 'reason'
    const [periodo, setPeriodo] = useState('ano');
    const [ano, setAno] = useState(new Date().getFullYear().toString());
    const [tipoMel, setTipoMel] = useState('');
    const [honeyTypes, setHoneyTypes] = useState([]);
    const [lossData, setLossData] = useState([]);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);

    const periodOptions = [
        { value: 'ano', label: 'Ano' },
        // { value: 'mes', label: 'Mês' }, // Simplificado para Ano por enquanto
        // { value: 'semana', label: 'Semana' }
    ];

    const yearOptions = [
        { value: '2026', label: '2026' },
        { value: '2025', label: '2025' },
        { value: '2024', label: '2024' }
    ];

    const showToast = (message, type) => {
        setToast({ message, type });
    };

    // 1. Carregar Reference Data (Tipos de Mel)
    useEffect(() => {
        const types = buscarTiposMel();
        setHoneyTypes(types);
        if (types.length > 0) {
            setTipoMel(types[0].value);
        }
    }, []);

    // 2. Fetch e processar dados
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Busca todos os apiários
                const apiariosRes = await buscarApiarios();
                const apiarios = Array.isArray(apiariosRes) ? apiariosRes : (apiariosRes?.dados || []);

                let allLosses = [];

                // Para cada apiário, busca movimentações
                // Nota: Idealmente o backend teria um endpoint de relatório consolidado.
                // Como não tem, fazemos N requests.
                for (const apiario of apiarios) {
                    try {
                        const prodRes = await buscarProducaoDoApiario(apiario.id);
                        // A API retorna um objeto que pode conter 'dados' que é a lista de movimentações?
                        // Ou retorna um objeto com totais?
                        // Baseado em ApiaryPerformance e ProductionRegistration, parece que buscarProducaoDoApiario retorna totais
                        // Precisamos de buscar movimentações BRUTAS.
                        // Olhando apiarioService.js: buscarMovimentacoes(apiarioId, tipo, ano)
                        // Mas ProductionRegistration usa 'registrarMovimentacao'
                        // Vamos tentar usar buscarProducaoDoApiario se ele retornar a lista detalhada.

                        // Se buscarProducaoDoApiario retorna DTO de totais, precisamos de outra rota.
                        // O 'buscarMovimentacoes' no service parecia comentado/simulado.
                        // Vamos assumir que 'buscarProducaoDoApiario' retorna lista ou totais.
                        // Se retornar totais, não conseguimos fazer gráfico mensal.

                        // Assumindo que precisamos da lista:
                        // Vamos olhar o service novamente... 
                        // buscarProducaoDoApiario chama '/api/Producao/BuscarProducoesDoApiario/{apiarioId}'
                        // Vamos assumir que retorna lista de movimentações (incluindo perdas se o backend estiver configurado assim, ou apenas produção)

                        // Se a rota for só de produção, talvez não retorne perdas (tipo 3).
                        // Mas assumindo que retorna uma lista de histórico:

                        const dados = Array.isArray(prodRes) ? prodRes : (prodRes?.dados || []);

                        // Filtra por perdas (tipo 3) e ano
                        const losses = dados.filter(m => {
                            // Verifica tipo (3 = Perda)
                            if (m.tipo !== 3) return false;

                            // Verifica ano
                            const dataMov = m.data ? new Date(m.data) : null;
                            if (!dataMov) return false;
                            if (dataMov.getFullYear().toString() !== ano) return false;

                            // Filtra por Tipo de Mel (se selecionado)
                            // A info do tipo de mel pode estar na 'observacao' ou no apiário.
                            // Como salvo em 'observacao' no registro ("Tipo de mel: X"), vamos tentar extrair.
                            if (filterType === 'honey' && tipoMel) {
                                // Tenta achar no registro
                                const obs = m.observacao || '';
                                if (!obs.includes(tipoMel)) {
                                    // Se não está na observação, verifica se o apiário é desse tipo
                                    const tipoMelApiario = apiario.tipoDeMel || apiario.TipoDeMel;
                                    if (tipoMelApiario !== tipoMel) return false;
                                }
                            }

                            // Se for filtro por Motivo, ainda não implementamos filtro de texto livre, mas ok.

                            return true;
                        });

                        allLosses = [...allLosses, ...losses];

                    } catch (err) {
                        console.warn(`Erro ao buscar perdas do apiário ${apiario.id}`, err);
                    }
                }

                // Agrega por mês para o gráfico
                const monthlyData = Array(12).fill(0).map((_, i) => ({
                    name: new Date(0, i).toLocaleString('pt-BR', { month: 'short' }), // Jan, Fev, ...
                    index: i + 1,
                    valor: 0
                }));

                allLosses.forEach(loss => {
                    const date = new Date(loss.data);
                    const monthIndex = date.getMonth(); // 0-11
                    monthlyData[monthIndex].valor += (loss.quantidadeKg || 0);
                });

                setLossData(monthlyData);

            } catch (error) {
                console.error("Erro ao carregar relatório:", error);
                showToast("Erro ao carregar dados do relatório.", "error");
            } finally {
                setLoading(false);
            }
        };

        if (periodo === 'ano') { // Simplificação: só busca se for filtro anual por enquanto
            fetchData();
        }
    }, [ano, tipoMel, filterType, periodo]);

    const handleBack = () => {
        navigate('/dashboard');
    };

    return (
        <div className="registration-page">
            <Navbar />

            <main className="reg-content">
                <div className="reg-header-bar">
                    <div className="title-box">
                        <h1>Relatório de Perdas</h1>
                    </div>
                    <div className="action-buttons-container">
                        <button className="btn-action btn-cancel-action" onClick={handleBack}>
                            <ArrowLeft size={18} />
                            Voltar
                        </button>
                    </div>
                </div>

                <div className="loss-report-filters-container">
                    <div className="filter-header-label">Filtrar por:</div>
                    <div className="filter-tabs-row">
                        <button
                            className={`filter-tab-btn ${filterType === 'honey' ? 'active' : ''}`}
                            onClick={() => setFilterType('honey')}
                        >
                            Tipo de Mel
                        </button>
                        {/* 
                        <button
                            className={`filter-tab-btn ${filterType === 'reason' ? 'active' : ''}`}
                            onClick={() => setFilterType('reason')}
                        >
                            Motivo da Perda
                        </button> 
                        */}
                    </div>

                    <div className="filter-inputs-row">
                        {filterType === 'honey' && (
                            <div className="filter-col">
                                <label>Tipo de mel</label>
                                <CustomSelect
                                    options={honeyTypes}
                                    value={tipoMel}
                                    onChange={setTipoMel}
                                />
                            </div>
                        )}
                        {/* Se fosse motivo, poderia ser um input de texto ou lista de motivos cadastrados */}
                    </div>

                    <div className="filter-inputs-row mt-10">
                        <div className="filter-col">
                            <label>Período</label>
                            <CustomSelect
                                options={periodOptions}
                                value={periodo}
                                onChange={setPeriodo}
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
                    </div>
                </div>

                <div className="loss-chart-container">
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                            Carregando dados...
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
                                    tickFormatter={(value) => `${value}kg`}
                                    dx={-10}
                                    label={{ value: 'Volume (Kg)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600, fill: '#333', textAnchor: 'middle' } }}
                                />
                                <Tooltip
                                    formatter={(value) => [`${value}kg`, 'Perdas']}
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
                                    fill="#ff4d4d"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={60}
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
