using BackendApi.Data;
using BackendApi.Models;
using BackendApi.Services.SenhaService;
using Microsoft.EntityFrameworkCore;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var senhaService = scope.ServiceProvider.GetRequiredService<ISenhaInterface>();

        // 🔹 Só cria se NÃO existir admin
        if (await context.Users.AnyAsync(u => u.IsAdmin))
            return;

        senhaService.CriarSenhaHash("admin", out byte[] hash, out byte[] salt);

        var admin = new User
        {
            Nome = "admin",
            Email = "admin@admin.com",
            Celular = "(00)0000-0000",
            Cpf = "00000000000",
            IsAdmin = true,
            PasswordHash = hash,
            PasswordSalt = salt
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync();
    }
}