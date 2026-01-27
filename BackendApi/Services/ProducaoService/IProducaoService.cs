using BackendApi.Dto.ProducaoDTO;
using BackendApi.Models;

namespace BackendApi.Services.ProducaoService
{
    public interface IProducaoService
    {
        Task<Response<ProducaoApiarioResponseDTO>> BuscarProducaoDoApiario(int userId, int apiarioId);
        Task<Response<List<GraficoMensalProducaoDTO>>> BuscarGraficoMensal(int userId, int ano);
        Task<Response<ProducaoResumoDTO>> BuscarResumoProducao(int userId);

    }
}
