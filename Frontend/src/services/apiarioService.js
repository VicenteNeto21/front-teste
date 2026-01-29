// Registrar movimentação de produção (colheita)
export const registrarMovimentacao = (apiarioId, payload) =>
    apiFetch(`/api/apiarios/${apiarioId}/movimentacoes`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
// Buscar movimentações por apiário, tipo e ano
export const buscarMovimentacoes = async (apiarioId, tipo, ano) => {
    let url = `/api/apiarios/${apiarioId}/movimentacoes`;
    // O backend pode não aceitar query params, mas tentamos filtrar no frontend se necessário
    const response = await apiFetch(url, { method: 'GET' });
    // Filtra por tipo e ano no frontend
    if (Array.isArray(response)) {
        return response.filter(mov => mov.tipo === tipo && mov.data && mov.data.startsWith(ano));
    } else if (response?.dados && Array.isArray(response.dados)) {
        return response.dados.filter(mov => mov.tipo === tipo && mov.data && mov.data.startsWith(ano));
    }
    return [];
};

// Buscar gráfico mensal de perdas
export const buscarGraficoMensal = (apiarioId, ano) =>
    apiFetch(`/api/apiarios/${apiarioId}/movimentacoes/grafico-mensal?ano=${ano}`);
import { apiFetch } from './api';

// Buscar apiários do usuário logado
export const buscarApiarios = () =>
    apiFetch('/api/Apiario/BuscarApiariosUserLogado');

// Criar novo apiário
export const criarApiario = (dadosApiario) =>
    apiFetch('/api/Apiario/CriarApiario', {
        method: 'POST',
        body: JSON.stringify(dadosApiario)
    });

// Editar apiário existente
export const editarApiario = (apiarioId, dadosAtualizados) =>
    apiFetch(`/api/Apiario/EditarApiario/${apiarioId}`, {
        method: 'PUT',
        body: JSON.stringify(dadosAtualizados)
    });

// Deletar apiário
export const deletarApiario = (apiarioId) =>
    apiFetch(`/api/Apiario/DeletarApiario/${apiarioId}`, {
        method: 'DELETE'
    });

export const buscarColmeiasDoApiario = (apiarioId) =>
    apiFetch(`/api/Colmeia/BuscarColmeiasDoApiario/${apiarioId}`);

// Buscar todas as colmeias do usuário logado
export const buscarColmeias = async () => {
    try {
        // Tenta buscar todas as colmeias do usuário
        const apiarios = await buscarApiarios();

        // Garante que é um array
        let apiariesArray = Array.isArray(apiarios) ? apiarios : (apiarios?.dados || []);

        // Busca colmeias de cada apiário
        const allHives = [];
        for (const apiary of apiariesArray) {
            try {
                const hives = await buscarColmeiasDoApiario(apiary.id);
                const hivesArray = Array.isArray(hives) ? hives : (hives?.dados || []);
                allHives.push(...hivesArray);
            } catch (error) {
                console.warn(`Erro ao buscar colmeias do apiário ${apiary.id}:`, error);
            }
        }

        return allHives;
    } catch (error) {
        console.error('Erro ao buscar colmeias:', error);
        return [];
    }
};

// Criar nova colmeia
export const criarColmeia = (dadosColmeia) =>
    apiFetch('/api/Colmeia/CriarColmeia', {
        method: 'POST',
        body: JSON.stringify(dadosColmeia)
    });

// Editar colmeia existente
export const editarColmeia = (colmeiaId, dadosAtualizados) =>
    apiFetch(`/api/Colmeia/EditarColmeia/${colmeiaId}`, {
        method: 'PUT',
        body: JSON.stringify(dadosAtualizados)
    });

// Deletar colmeia
export const deletarColmeia = (colmeiaId) =>
    apiFetch(`/api/Colmeia/DeletarColmeia/${colmeiaId}`, {
        method: 'DELETE'
    });

// Buscar produção do apiário
export const buscarProducaoDoApiario = (apiarioId) =>
    apiFetch(`/api/Producao/BuscarProducoesDoApiario/${apiarioId}`);

// Criar nova produção
export const criarProducao = (dadosProducao) =>
    apiFetch('/api/apiarios/' + dadosProducao.apiarioId + '/movimentacoes', {
        method: 'POST',
        body: JSON.stringify(dadosProducao)
    });

// Buscar tipos de mel
export const buscarTiposMel = () => [
    { value: 'FloralSilvestral', label: 'Floral Silvestre' },
    { value: 'Eucalipto', label: 'Eucalipto' },
    { value: 'Laranja', label: 'Laranja' },
    { value: 'Acacia', label: 'Acácia' }
];
