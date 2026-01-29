using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BackendApi.Services.ProducaoService;
using System.Security.Claims;

namespace BackendApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProducaoController : ControllerBase
    {
        private readonly IProducaoService _producaoInterface;

        public ProducaoController(IProducaoService producaoInterface)
        {
            _producaoInterface = producaoInterface;
        }

        // [HttpPost("CriarProducao")]
        // public async Task<ActionResult> CriarProducao(ProducaoCreateDTO dto)
        // {
        //     var response = await _producaoInterface.CriarProducao(dto);
        //     return Ok(response);
        // }

        [HttpGet("BuscarProducoesDoApiario/{apiarioId}")]
        public async Task<ActionResult> BuscarProducoesDoApiario(int apiarioId)
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var response = await _producaoInterface.BuscarProducaoDoApiario(userId, apiarioId);
            return Ok(response);
        }

        [HttpGet("ResumoTodosApiariosDoUsuario")]
        public async Task<ActionResult> BuscarResumoProducao()
        {
            int userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var response = await _producaoInterface.BuscarResumoProducao(userId);
            return Ok(response);
        }

        
    }
}
