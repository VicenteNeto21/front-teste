using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BackendApi.Dto.MovimentacaoDTO;
using System.Security.Claims;

namespace BackendApi.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/apiarios/{apiarioId}/movimentacoes")]
    public class MovimentacaoController : ControllerBase
    {
        private readonly IMovimentacaoService _movimentacaoService;

        public MovimentacaoController(IMovimentacaoService movimentacaoService)
        {
            _movimentacaoService = movimentacaoService;
        }

        [HttpPost]
        public async Task<ActionResult> CriarMovimentacao(int apiarioId, [FromBody] MovimentacaoCreateDTO dto)
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var response = await _movimentacaoService.CriarMovimentacao(userId ,apiarioId, dto);
            
            return Ok(response);
        }

        [HttpGet]
        public async Task<ActionResult> Listar(int apiarioId)
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var response = await _movimentacaoService.ListarPorApiario(userId, apiarioId);
            return Ok(response);
        }

        [HttpGet("{movimentacaoId}")]
        public async Task<ActionResult> BuscarPorId(int apiarioId, int movimentacaoId)
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var response = await _movimentacaoService.BuscarPorId(userId, apiarioId, movimentacaoId);
            return Ok(response);
        }

        [HttpGet("grafico-mensal")]
        public async Task<ActionResult> GraficoMensal(
            int apiarioId,
            [FromQuery] int ano)
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var response = await _movimentacaoService.GraficoMensal(userId, apiarioId, ano);
            return Ok(response);
        }
        }
}
