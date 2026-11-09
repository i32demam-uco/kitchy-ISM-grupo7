using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;
using Kitchy.Core.DTOs;
using Kitchy.Core.Models;
using Kitchy.Infrastructure.Data;
using Kitchy.Infrastructure.Repositories;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class AuthAndProfileIntegrationTests
    {
        private (KitchyDbContext context, AuthService authService, UserService userService) CreateTestContext()
        {
            var options = new DbContextOptionsBuilder<KitchyDbContext>()
                .UseInMemoryDatabase(databaseName: $"KitchyTestDb_{Guid.NewGuid()}")
                .Options;

            var context = new KitchyDbContext(options);
            var userRepo = new UserRepository(context);
            var houseRepo = new HouseRepository(context);

            var inMemorySettings = new Dictionary<string, string?>
            {
                { "Jwt:Key", "KitchySecretKeyForJwtAuthenticationUCO2026!SuperSecureJwtSigningKey" },
                { "Jwt:Issuer", "KitchyApi" },
                { "Jwt:Audience", "KitchyMobileClient" }
            };

            IConfiguration configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            var authService = new AuthService(userRepo, houseRepo, configuration);
            var userService = new UserService(userRepo, houseRepo);

            return (context, authService, userService);
        }

        [Fact]
        public async Task Register_ValidUser_HashesPasswordWithBCryptAndReturnsJwt()
        {
            var (context, authService, _) = CreateTestContext();
            var request = new RegisterRequest("nuevo@uco.es", "Secreto123!", "Nuevo Estudiante");

            var response = await authService.RegisterAsync(request);

            Assert.NotNull(response.Token);
            Assert.Equal("nuevo@uco.es", response.Email);
            Assert.Equal("Nuevo Estudiante", response.FullName);

            // Verificar que en la base de datos la contraseña NO se guarda en texto plano, sino en hash BCrypt
            var userInDb = await context.Users.FirstOrDefaultAsync(u => u.Email == "nuevo@uco.es");
            Assert.NotNull(userInDb);
            Assert.NotEqual("Secreto123!", userInDb.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify("Secreto123!", userInDb.PasswordHash));
        }

        [Fact]
        public async Task Register_DuplicateEmail_ThrowsInvalidOperationException()
        {
            var (_, authService, _) = CreateTestContext();
            var request = new RegisterRequest("duplicado@uco.es", "Password123!", "Usuario Uno");

            // Primer registro exitoso
            await authService.RegisterAsync(request);

            // Segundo registro con el mismo email debe ser rechazado
            var duplicateRequest = new RegisterRequest("duplicado@uco.es", "OtraPassword!", "Usuario Dos");
            await Assert.ThrowsAsync<InvalidOperationException>(() => authService.RegisterAsync(duplicateRequest));
        }

        [Fact]
        public async Task Authenticate_ValidCredentials_ReturnsValidJwt()
        {
            var (_, authService, _) = CreateTestContext();
            var registerReq = new RegisterRequest("login_test@uco.es", "MiClaveSegura!", "Login Tester");
            await authService.RegisterAsync(registerReq);

            var loginReq = new LoginRequest("login_test@uco.es", "MiClaveSegura!");
            var authResponse = await authService.AuthenticateAsync(loginReq);

            Assert.NotNull(authResponse.Token);
            Assert.Equal("login_test@uco.es", authResponse.Email);

            // Validar firma del token emitido
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "KitchyApi",
                ValidateAudience = true,
                ValidAudience = "KitchyMobileClient",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AuthService.DefaultDemoSecret)),
                ValidateLifetime = true
            };

            var principal = tokenHandler.ValidateToken(authResponse.Token, validationParameters, out var validatedToken);
            Assert.NotNull(validatedToken);
            Assert.Equal("login_test@uco.es", principal.FindFirst(ClaimTypes.Email)?.Value);
        }

        [Fact]
        public async Task Authenticate_WrongPassword_ThrowsUnauthorizedAccessException()
        {
            var (_, authService, _) = CreateTestContext();
            var registerReq = new RegisterRequest("user_bad_pwd@uco.es", "PasswordOriginal!", "Test User");
            await authService.RegisterAsync(registerReq);

            var badLoginReq = new LoginRequest("user_bad_pwd@uco.es", "ContraseñaEquivocada!");
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() => authService.AuthenticateAsync(badLoginReq));
        }

        [Fact]
        public void JwtValidation_ExpiredToken_IsRejected()
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AuthService.DefaultDemoSecret));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // Token emitido en el pasado y expirado
            var expiredDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "aleja") }),
                NotBefore = DateTime.UtcNow.AddHours(-2),
                Expires = DateTime.UtcNow.AddMinutes(-30),
                Issuer = "KitchyApi",
                Audience = "KitchyMobileClient",
                SigningCredentials = credentials
            };

            var expiredToken = tokenHandler.WriteToken(tokenHandler.CreateToken(expiredDescriptor));

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "KitchyApi",
                ValidateAudience = true,
                ValidAudience = "KitchyMobileClient",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = securityKey,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            Assert.Throws<SecurityTokenExpiredException>(() =>
                tokenHandler.ValidateToken(expiredToken, validationParameters, out _));
        }

        [Fact]
        public void JwtValidation_InvalidSignature_IsRejected()
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            // Firmado con clave no autorizada
            var fakeKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("ClaveFalsaTotalmenteDiferenteDe32BytesOmas!"));
            var credentials = new SigningCredentials(fakeKey, SecurityAlgorithms.HmacSha256);

            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "aleja") }),
                Expires = DateTime.UtcNow.AddDays(1),
                Issuer = "KitchyApi",
                Audience = "KitchyMobileClient",
                SigningCredentials = credentials
            };

            var forgedToken = tokenHandler.WriteToken(tokenHandler.CreateToken(descriptor));

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = "KitchyApi",
                ValidateAudience = true,
                ValidAudience = "KitchyMobileClient",
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(AuthService.DefaultDemoSecret)),
                ValidateLifetime = true
            };

            Assert.ThrowsAny<SecurityTokenException>(() =>
                tokenHandler.ValidateToken(forgedToken, validationParameters, out _));
        }

        [Fact]
        public async Task UserService_GetAndUpdateProfile_WorksCorrectly()
        {
            var (_, authService, userService) = CreateTestContext();
            var reg = await authService.RegisterAsync(new RegisterRequest("perfil@uco.es", "ClaveSegura123!", "Perfil Inicial"));

            var profile = await userService.GetProfileAsync(reg.UserId);
            Assert.NotNull(profile);
            Assert.Equal("Perfil Inicial", profile.FullName);

            // Actualizar perfil
            var updated = await userService.UpdateProfileAsync(reg.UserId, new UpdateProfileDto("Perfil Modificado", "https://avatar.test.jpg"));
            Assert.NotNull(updated);
            Assert.Equal("Perfil Modificado", updated.FullName);
            Assert.Equal("https://avatar.test.jpg", updated.AvatarUrl);
        }

        [Fact]
        public async Task UserService_ChangePassword_BCryptVerification()
        {
            var (_, authService, userService) = CreateTestContext();
            var reg = await authService.RegisterAsync(new RegisterRequest("pwd_change@uco.es", "ClaveVieja123!", "Cambio Clave"));

            // Intentar cambiar con contraseña actual errónea -> falla
            var fail = await userService.ChangePasswordAsync(reg.UserId, new ChangePasswordDto("ClaveErronea", "NuevaClaveSuper456!"));
            Assert.False(fail);

            // Cambiar con contraseña actual correcta -> éxito
            var success = await userService.ChangePasswordAsync(reg.UserId, new ChangePasswordDto("ClaveVieja123!", "NuevaClaveSuper456!"));
            Assert.True(success);

            // Ahora el login debe funcionar con la nueva contraseña
            var loginOk = await authService.AuthenticateAsync(new LoginRequest("pwd_change@uco.es", "NuevaClaveSuper456!"));
            Assert.NotNull(loginOk.Token);
        }
    }
}
