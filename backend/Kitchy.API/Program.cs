using System;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Kitchy.API.Hubs;
using Kitchy.Core.Interfaces;
using Kitchy.Infrastructure.Data;
using Kitchy.Infrastructure.Repositories;
using Kitchy.Services.Implementations;
using Kitchy.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Configuration
var postgresConn = builder.Configuration.GetConnectionString("PostgreSQL");
var sqliteConn = builder.Configuration.GetConnectionString("SQLite") ?? "Data Source=kitchy_local.db";

// Use SQLite/In-Memory with PostgreSQL readiness
builder.Services.AddDbContext<KitchyDbContext>(options =>
{
    // If PG host is configured and reachable in production:
    if (!string.IsNullOrEmpty(postgresConn) && !postgresConn.Contains("YourPasswordHere"))
    {
        options.UseNpgsql(postgresConn);
    }
    else
    {
        options.UseSqlite(sqliteConn);
    }
});

// 2. Dependency Injection: Repositories
builder.Services.AddScoped<IInventoryRepository, InventoryRepository>();
builder.Services.AddScoped<IShoppingListRepository, ShoppingListRepository>();
builder.Services.AddScoped<IRecipeRepository, RecipeRepository>();
builder.Services.AddScoped<IHouseRepository, HouseRepository>();
builder.Services.AddScoped<IMasterProductRepository, MasterProductRepository>();
builder.Services.AddScoped<IPriceHistoryRepository, PriceHistoryRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// 3. Dependency Injection: Services
builder.Services.AddHttpClient();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IShoppingListService, ShoppingListService>();
builder.Services.AddScoped<IDeltaService, DeltaService>();
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<IOcrService, OcrService>();
builder.Services.AddScoped<IOpenFoodFactsService, OpenFoodFactsService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();

// 4. SignalR Realtime Hub
builder.Services.AddSignalR();

// 5. JWT Authentication & Cybersecurity By Design (RNF5)
var jwtKey = builder.Configuration["Jwt:Key"] ?? AuthService.DefaultDemoSecret;
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "KitchyApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "KitchyMobileClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // Allow JWT in SignalR WebSocket handshake
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/kitchy"))
            {
                context.Token = accessToken;
            }
            return System.Threading.Tasks.Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
builder.Services.AddControllers();

// 6. CORS Policy for React Native Mobile App
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// 7. Swagger Documentation with JWT Bearer Support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Kitchy API - Cerebro N-Capas",
        Version = "v1",
        Description = "API REST de Kitchy para la gestión inteligente de inventario y recetario con fricción cero (UCO Grupo 7)"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed Database automatically on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<KitchyDbContext>();
    await DataSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment() || true)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Kitchy API v1");
    });
}

// Redirect root / directly to Swagger UI
app.MapGet("/", () => Results.Redirect("/swagger"));

app.UseRouting();
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<KitchyHub>("/hubs/kitchy");

app.Run();

// Required for WebApplicationFactory in tests
public partial class Program { }
