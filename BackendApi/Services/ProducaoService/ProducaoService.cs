using BackendApi.Data;
using BackendApi.Dto.ApiarioDTO;
using BackendApi.Dto.ProducaoDTO;
using BackendApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BackendApi.Services.ProducaoService
{
    public class ProducaoService : IProducaoService
    {
        private readonly AppDbContext _context;

        public ProducaoService(AppDbContext context)
        {
            _context = context;
        }

       public async Task<Response<ProducaoApiarioResponseDTO>> BuscarProducaoDoApiario(int userId, int apiarioId)
        {
            var response = new Response<ProducaoApiarioResponseDTO>();

            try
            {
                var producao = await _context.ProducaoApiarios
                    .Where(p =>
                        p.Apiario.Id == apiarioId &&
                        p.Apiario.User.Id == userId
                    )
                    .Select(p => new ProducaoApiarioResponseDTO
                    {
                        Id = p.Id,
                        ApiarioId= p.Apiario.Id,
                        TotalProduzidoKg = p.TotalProduzidoKg,
                        TotalVendido = p.TotalVendido,
                        EstoqueAtualKg = p.EstoqueAtualKg,
                        Observacao = p.Observacao,
                        CreationDate = p.CreationDate,

                    })
                    .FirstOrDefaultAsync();

                if (producao == null)
                {
                    response.Status = false;
                    response.Mensage = "Produção não encontrada";
                    return response;
                }

                response.Status = true;
                response.Mensage = "Produção encontrada!";
                response.Dados = producao;
            }
            catch (Exception ex)
            {
                response.Status = false;
                response.Mensage = $"Erro ao buscar produção: {ex.Message}";
            }

            return response;
        }

        public async Task<Response<ProducaoResumoDTO>> BuscarResumoProducao(int userId)
        {
            var response = new Response<ProducaoResumoDTO>();

            try
            {
                var resumo = await _context.ProducaoApiarios
                    .Where(p => p.Apiario.User.Id == userId)
                    .GroupBy(_ => 1)
                    .Select(g => new ProducaoResumoDTO
                    {
                        TotalProduzidoKg = g.Sum(x => x.TotalProduzidoKg),
                        TotalVendido = g.Sum(x => x.TotalVendido),
                        EstoqueAtualKg = g.Sum(x => x.EstoqueAtualKg)
                    })
                    .FirstOrDefaultAsync();

                if (resumo == null)
                {
                    response.Status = false;
                    response.Mensage = "Nenhuma produção encontrada";
                    return response;
                }

                response.Status = true;
                response.Mensage = "Resumo de produção carregado com sucesso";
                response.Dados = resumo;
            }
            catch (Exception ex)
            {
                response.Status = false;
                response.Mensage = $"Erro ao buscar resumo da produção: {ex.Message}";
            }

            return response;
        }

        public async Task<Response<List<GraficoMensalProducaoDTO>>> BuscarGraficoMensal(int userId, int ano)
        {
            var response = new Response<List<GraficoMensalProducaoDTO>>();

            try
            {
                var dados = await _context.MovimentacaoMel
                    .Where(m =>
                        m.Apiario.User.Id == userId &&
                        m.Data.Year == ano
                    )
                    .GroupBy(m => m.Data.Month)
                    .Select(g => new GraficoMensalProducaoDTO
                    {
                        Mes = g.Key,
                        EntradaKg = g
                            .Where(x => x.Tipo == Enums.TipoMovimentoMelEnum.Colheita)
                            .Sum(x => x.QuantidadeKg),

                        SaidaKg = g
                            .Where(x =>
                                x.Tipo == Enums.TipoMovimentoMelEnum.Venda ||
                                x.Tipo == Enums.TipoMovimentoMelEnum.Perda
                            )
                            .Sum(x => x.QuantidadeKg)
                    })
                    .OrderBy(x => x.Mes)
                    .ToListAsync();

                response.Status = true;
                response.Mensage = "Gráfico mensal carregado com sucesso";
                response.Dados = dados;
            }
            catch (Exception ex)
            {
                response.Status = false;
                response.Mensage = $"Erro ao buscar gráfico mensal: {ex.Message}";
            }

            return response;
        }
    }
}
