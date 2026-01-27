using BackendApi.Data;
using BackendApi.Services.ApiarioService;
using BackendApi.Services.AuthService;
using BackendApi.Services.ColmeiaService;
using BackendApi.Services.MovimentacaoService;
using BackendApi.Services.ProducaoService;
using BackendApi.Services.SenhaService;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.Filters;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// -----------------------------------------------------------------------------
// Serviços essenciais
// -----------------------------------------------------------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();

// -----------------------------------------------------------------------------
// Serviços próprios da aplicação
// -----------------------------------------------------------------------------
builder.Services.AddScoped<IAuthInterface, AuthService>();
builder.Services.AddScoped<ISenhaInterface, SenhaService>();
builder.Services.AddScoped<IApiarioService, ApiarioService>();
builder.Services.AddScoped<IColmeiaService, ColmeiaService>();
builder.Services.AddScoped<IProducaoService, ProducaoService>();
builder.Services.AddScoped<IMovimentacaoService, MovimentacaoService>();


builder.Services.AddCors(options =>
{
    options.AddPolicy(name: "AllowFrontend",
        builder =>
        {
            // Permite requisições de localhost na porta do seu frontend Vite
            builder.WithOrigins("http://localhost:5173") 
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });
});

// -----------------------------------------------------------------------------
// Banco de dados
// -----------------------------------------------------------------------------
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null
        )
    );
});

// -----------------------------------------------------------------------------
// Swagger com autenticação JWT
// -----------------------------------------------------------------------------
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Description = "Autorização via Bearer {token}",
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey
    });

    options.OperationFilter<SecurityRequirementsOperationFilter>();
});

// -----------------------------------------------------------------------------
// Autenticação JWT
// -----------------------------------------------------------------------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var tokenKey = builder.Configuration["AppSettings:Token"];

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(tokenKey)),
            ValidateIssuer = false,
            ValidateAudience = false,

            // 🔥 ESSENCIAL PARA AUTORIZAR POR ROLE
            RoleClaimType = ClaimTypes.Role 
        };
    });

// -----------------------------------------------------------------------------
// Construção do app
// -----------------------------------------------------------------------------
var app = builder.Build();

// -----------------------------------------------------------------------------
// Aplicar migrations automaticamente
// -----------------------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.UseAuthentication(); // Primeiro autentica
app.UseAuthorization();  // Depois autoriza

app.MapControllers();

app.Run();
