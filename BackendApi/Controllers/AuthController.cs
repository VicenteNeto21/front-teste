using Microsoft.AspNetCore.Mvc;
using BackendApi.Dto;
using BackendApi.Services.AuthService;
using Microsoft.AspNetCore.Authorization;

namespace BackendApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthInterface _authInterface;
        public AuthController(IAuthInterface authInterface)
        {
            _authInterface = authInterface;
        }
        [HttpPost("Login")]
        public async Task<ActionResult> Login(UserLoginDTO userLogin)
        {
            var response = await _authInterface.Login(userLogin);
            return Ok(response);
        }
        
        [Authorize(Roles = "Admin")]
        [HttpPost("Register")]
        public async Task<ActionResult> Register(UserCriacaoDTO UserRegister)
        {
            var response = await _authInterface.Registrar(UserRegister);
            return Ok(response);
        }

    }
}