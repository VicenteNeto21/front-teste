using System.Globalization;
using BackendApi.Data;
using BackendApi.Dto.MovimentacaoDTO;
using BackendApi.Enums;
using BackendApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BackendApi.Services.MovimentacaoService
{
    public class MovimentacaoService : IMovimentacaoService
    {
        private readonly AppDbContext _context;

        public MovimentacaoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Response<string>> CriarMovimentacao(int userId, int apiarioId, MovimentacaoCreateDTO dto)
        {
            var response = new Response<string>();

            try
            {
                // 1) Validar apiário e o userId que está logado.
                var apiario = await _context.Apiarios
                    .FirstOrDefaultAsync(a => a.Id == apiarioId && a.User.Id == userId && a.DeletionDate == null);

                if (apiario == null)
                {
                    response.Status = false;
                    response.Mensage = "Apiário não encontrado.";
                    return response;
                }

                if (dto.QuantidadeKg <= 0)
                {
                    response.Status = false;
                    response.Mensage = "A quantidade (Kg) deve ser maior que zero.";
                    return response;
                }

                var colmeia = await _context.Colmeias.Include(c => c.Apiario).FirstOrDefaultAsync(c => c.Apiario.Id == apiario.Id && c.Id == dto.ColmeiaId && c.DeletionDate == null);

                if(dto.Tipo == TipoMovimentoMelEnum.Colheita && colmeia == null)
                {
                    response.Status = false;
                    response.Mensage = "Não existe colmeia no apiario para a colheita, não tem como haver movimentação";
                    return response;
                }
                
                if(dto.Tipo == TipoMovimentoMelEnum.Colheita && colmeia?.Status == StatusAtividadeEnum.Desativada)
                {
                    response.Status = false;
                    response.Mensage = "A colmeia está desativada";
                    return response;
                }

                if(dto.Tipo != TipoMovimentoMelEnum.Colheita && dto.ColmeiaId != null)
                {
                    response.Status = false;
                    response.Mensage = "Não sendo colheita não é preciso colocar o 'ColmeiaId' ";
                    return response;
                }

                // 2) Buscar produção consolidada do apiário
                var producao = await _context.ProducaoApiarios
                    .FirstOrDefaultAsync(p => p.Apiario.Id == apiarioId && p.DeletionDate == null);

                if (producao == null)
                {
                    response.Status = false;
                    response.Mensage = "Produção do apiário não encontrada. Verifique se ela é criada ao criar o apiário.";
                    return response;
                }

                // (Opcional) regra de valor: se for venda, valor não pode ser negativo
                if (dto.Tipo == TipoMovimentoMelEnum.Venda && dto.Valor <= 0)
                {
                    response.Status = false;
                    response.Mensage = "Para venda, o valor deve ser maior que zero.";
                    return response;
                }

                // Ao colher quer dizer que eu retirei mel da comeia e vou colocar na minha produção do meu apiario
                // se houver 0 na colheita quer dizer que não é necessário anotar a movimentação
                if (dto.Tipo == TipoMovimentoMelEnum.Colheita && dto.QuantidadeKg < 0)
                {
                    response.Status = false;
                    response.Mensage = $"Colheita com quantidadeKg menor ou igual a zero não precisa ser movimentada";
                    return response;
                }
                if(dto.Tipo != TipoMovimentoMelEnum.Colheita && dto.QuantidadeKg > producao.EstoqueAtualKg)
                {
                    response.Status = false;
                    response.Mensage = "O estoque atual não contém quantidade de Kg suficiente para realizar a venda, perda ou doação";
                    return response;
                }

                if(dto.Tipo == TipoMovimentoMelEnum.Colheita && dto.Valor > 0)
                {
                    response.Status = false;
                    response.Mensage = "A colheita não aceita o campo valor pois esta apenas colhendo!";
                    return response;
                }

                if((dto.Tipo == TipoMovimentoMelEnum.Perda || dto.Tipo == TipoMovimentoMelEnum.Doacao) && dto.Valor > 0)
                {
                    response.Status = false;
                    response.Mensage = "Perdas e doações não necessitam de valor";
                    return response;
                }

                var movimento = new MovimentoMel
                {
                    Apiario = apiario,
                    Tipo = dto.Tipo,
                    QuantidadeKg = dto.QuantidadeKg,
                    RetiradoDaColmeia = colmeia,
                    Valor = dto.Valor,
                    Data = dto.Data,
                    Observacao = dto.Observacao,
                    CreationDate = DateTime.Now
                };

                _context.MovimentacaoMel.Add(movimento);

                // Atualiza consolidado
                if (dto.Tipo == TipoMovimentoMelEnum.Colheita)
                {
                    producao.TotalProduzidoKg += dto.QuantidadeKg;
                    producao.EstoqueAtualKg += dto.QuantidadeKg;
                }
                else if(dto.Tipo == TipoMovimentoMelEnum.Venda)
                {
                    producao.EstoqueAtualKg -= dto.QuantidadeKg;
                    producao.TotalVendido += dto.Valor;
                }
                else
                {
                    producao.EstoqueAtualKg -= dto.QuantidadeKg;
                }
                await _context.SaveChangesAsync();

                response.Status = true;
                response.Mensage = "Movimentação registrada com sucesso.";
                return response;

            }
            catch (Exception ex)
            {
                response.Status = false;
                response.Mensage = "Erro ao registrar movimentação: " + ex.Message;
                return response;
            }
        }

        public async Task<Response<List<MovimentacaoResponseDTO>>> ListarPorApiario(int userId, int apiarioId)
        {
            var response = new Response<List<MovimentacaoResponseDTO>>();

            var dados = await _context.MovimentacaoMel
                .Where(m =>
                    m.Apiario.Id == apiarioId &&
                    m.Apiario.User.Id == userId &&
                    m.DeletionDate == null
                )
                .OrderByDescending(m => m.Data)
                .Select(m => new MovimentacaoResponseDTO
                {
                    Id = m.Id,
                    Tipo = m.Tipo,
                    QuantidadeKg = m.QuantidadeKg,
                    Valor = m.Valor,
                    Data = m.Data,
                    Motivo = m.Motivo,
                    Observacao = m.Observacao
                })
                .ToListAsync();

            response.Status = true;
            response.Dados = dados;
            return response;
        }

        public async Task<Response<MovimentacaoResponseDTO>> BuscarPorId(int userId, int apiarioId,int movimentacaoId)
        {
            var response = new Response<MovimentacaoResponseDTO>();

            var movimentacao = await _context.MovimentacaoMel
                .Where(m =>
                    m.Id == movimentacaoId &&
                    m.Apiario.Id == apiarioId &&
                    m.Apiario.User.Id == userId
                )
                .Select(m => new MovimentacaoResponseDTO
                {
                    Id = m.Id,
                    Tipo = m.Tipo,
                    QuantidadeKg = m.QuantidadeKg,
                    Valor = m.Valor,
                    Data = m.Data,
                    Motivo = m.Motivo,
                    Observacao = m.Observacao
                })
                .FirstOrDefaultAsync();

            if (movimentacao == null)
            {
                response.Status = false;
                response.Mensage = "Movimentação não encontrada";
                return response;
            }

            response.Status = true;
            response.Dados = movimentacao;
            return response;
        }

        public async Task<Response<List<GraficoMensalMovimentacaoDTO>>> GraficoMensal(int userId, int apiarioId, int ano)
        {
            var response = new Response<List<GraficoMensalMovimentacaoDTO>>();

            var movimentos = await _context.MovimentacaoMel
                .Where(m =>
                    m.Apiario.Id == apiarioId &&
                    m.Apiario.User.Id == userId &&
                    m.Data.Year == ano
                )
                .ToListAsync();

            var resultado = Enumerable.Range(1, 12)
                .Select(mes => new GraficoMensalMovimentacaoDTO
                {
                    Mes = mes,
                    NomeMes = CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(mes),
                    TotalEntradaKg = movimentos
                        .Where(m => m.Data.Month == mes && m.Tipo == TipoMovimentoMelEnum.Colheita)
                        .Sum(m => m.QuantidadeKg),
                    TotalSaidaKg = movimentos
                        .Where(m => m.Data.Month == mes && m.Tipo != TipoMovimentoMelEnum.Colheita)
                        .Sum(m => m.QuantidadeKg),
                    TotalVendaKg = movimentos
                        .Where(m => m.Data.Month == mes && m.Tipo == TipoMovimentoMelEnum.Venda)
                        .Sum(m => m.QuantidadeKg),
                    TotalPerdaKg = movimentos
                        .Where(m => m.Data.Month == mes && m.Tipo == TipoMovimentoMelEnum.Perda)
                        .Sum(m => m.QuantidadeKg),
                    TotalDoacaoKg = movimentos
                        .Where(m => m.Data.Month == mes && m.Tipo == TipoMovimentoMelEnum.Doacao)
                        .Sum(m => m.QuantidadeKg),
                    TotalVendaValor = movimentos
                        .Where(m => m.Data.Month == mes && m.Tipo == TipoMovimentoMelEnum.Venda)
                        .Sum(m => m.Valor)
                })
                .ToList();

            response.Status = true;
            response.Dados = resultado;
            return response;
        }
    }
}
