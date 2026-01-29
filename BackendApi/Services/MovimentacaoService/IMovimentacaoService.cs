using BackendApi.Dto.MovimentacaoDTO;
using BackendApi.Models;

public interface IMovimentacaoService
{
    Task<Response<string>> CriarMovimentacao(int userId, int apiarioId, MovimentacaoCreateDTO dto);
    Task<Response<List<MovimentacaoResponseDTO>>> ListarPorApiario(int userId, int apiarioId);
    Task<Response<MovimentacaoResponseDTO>> BuscarPorId(int userId, int apiarioId, int movimentacaoId);
    Task<Response<List<GraficoMensalMovimentacaoDTO>>> GraficoMensal(int userId, int apiarioId, int ano);
}
