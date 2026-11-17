using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Kitchy.Core.Models;

namespace Kitchy.Infrastructure.Data
{
    public static class DataSeeder
    {
        public static async Task SeedAsync(KitchyDbContext context)
        {
            await context.Database.EnsureCreatedAsync();

            var demoHouseId = Guid.Parse("a0000000-0000-0000-0000-000000000001");
            if (!await context.Houses.AnyAsync(h => h.Id == demoHouseId))
            {
                var house = new House
                {
                    Id = demoHouseId,
                    Name = "Piso Ciudad Jardín",
                    Address = "Calle Gran Vía Parque, Córdoba",
                    Latitude = 37.8847,
                    Longitude = -4.7892,
                    InviteCode = "UCO2026",
                    CreatedAt = DateTime.UtcNow
                };
                context.Houses.Add(house);

                context.UserHouses.AddRange(
                    new UserHouse { HouseId = demoHouseId, UserId = "aleja", Role = "Admin" },
                    new UserHouse { HouseId = demoHouseId, UserId = "jp", Role = "Member" },
                    new UserHouse { HouseId = demoHouseId, UserId = "david", Role = "Member" }
                );

                // Seed Default Users with Cryptographic BCrypt Hashing (RNF5)
                var defaultPasswordHash = BCrypt.Net.BCrypt.HashPassword("Kitchy2026!");
                if (!await context.Users.AnyAsync())
                {
                    context.Users.AddRange(
                        new User
                        {
                            Id = "aleja",
                            Email = "aleja@uco.es",
                            PasswordHash = defaultPasswordHash,
                            FullName = "Alejandro Gallardo",
                            AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new User
                        {
                            Id = "jp",
                            Email = "jp@uco.es",
                            PasswordHash = defaultPasswordHash,
                            FullName = "José Pablo de la Haba",
                            AvatarUrl = null,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        },
                        new User
                        {
                            Id = "david",
                            Email = "david@uco.es",
                            PasswordHash = defaultPasswordHash,
                            FullName = "David Ángel Aramyan",
                            AvatarUrl = null,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        }
                    );
                }

                var pPollo = new MasterProduct
                {
                    Id = Guid.Parse("b0000000-0000-0000-0000-000000000001"),
                    Name = "Pechuga de pollo",
                    Barcode = "8480000245671",
                    Category = "Carnicería",
                    ShelfLifeDays = 2,
                    DefaultUnit = "g",
                    ImageUrl = "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200"
                };

                var pHuevos = new MasterProduct
                {
                    Id = Guid.Parse("b0000000-0000-0000-0000-000000000002"),
                    Name = "Huevos L",
                    Barcode = "8480000123458",
                    Category = "Lácteos y Huevos",
                    ShelfLifeDays = 7,
                    DefaultUnit = "ud",
                    ImageUrl = "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200"
                };

                var pTomate = new MasterProduct
                {
                    Id = Guid.Parse("b0000000-0000-0000-0000-000000000003"),
                    Name = "Tomate frito Hacendado",
                    Barcode = "8480000350012",
                    Category = "Conservas",
                    ShelfLifeDays = 30,
                    DefaultUnit = "ud",
                    ImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
                };

                var pLeche = new MasterProduct
                {
                    Id = Guid.Parse("b0000000-0000-0000-0000-000000000004"),
                    Name = "Leche entera",
                    Barcode = "8480000412890",
                    Category = "Lácteos",
                    ShelfLifeDays = 10,
                    DefaultUnit = "l",
                    ImageUrl = "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200"
                };

                context.MasterProducts.AddRange(pPollo, pHuevos, pTomate, pLeche);

                // Add inventory matching the Figma mockup
                context.Inventory.AddRange(
                    new InventoryItem
                    {
                        Id = Guid.Parse("c0000000-0000-0000-0000-000000000001"),
                        HouseId = demoHouseId,
                        MasterProductId = pPollo.Id,
                        Name = "Pechuga de pollo",
                        Quantity = 500,
                        Unit = "g",
                        ExpirationDate = DateTime.UtcNow.AddHours(23), // Caduca en 24h (Urgente / Rojo)
                        Location = "Nevera",
                        Price = 3.60m,
                        AddedByUserId = "jp"
                    },
                    new InventoryItem
                    {
                        Id = Guid.Parse("c0000000-0000-0000-0000-000000000002"),
                        HouseId = demoHouseId,
                        MasterProductId = pHuevos.Id,
                        Name = "Huevos L",
                        Quantity = 6,
                        Unit = "ud",
                        ExpirationDate = DateTime.UtcNow.AddHours(44), // Caducan en 48h (Ámbar)
                        Location = "Nevera",
                        Price = 1.65m,
                        AddedByUserId = "david"
                    },
                    new InventoryItem
                    {
                        Id = Guid.Parse("c0000000-0000-0000-0000-000000000003"),
                        HouseId = demoHouseId,
                        MasterProductId = pTomate.Id,
                        Name = "Tomate frito Hacendado",
                        Quantity = 2,
                        Unit = "ud",
                        ExpirationDate = DateTime.UtcNow.AddDays(28),
                        Location = "Despensa",
                        Price = 1.70m,
                        AddedByUserId = "jp"
                    },
                    new InventoryItem
                    {
                        Id = Guid.Parse("c0000000-0000-0000-0000-000000000004"),
                        HouseId = demoHouseId,
                        MasterProductId = pLeche.Id,
                        Name = "Leche entera",
                        Quantity = 1,
                        Unit = "l",
                        ExpirationDate = DateTime.UtcNow.AddDays(7),
                        Location = "Nevera",
                        Price = 1.05m,
                        AddedByUserId = "david"
                    }
                );

                // Recipe: Pollo con tomate y huevo (from Figma mockup Screen 3)
                var recipe = new Recipe
                {
                    Id = Guid.Parse("d0000000-0000-0000-0000-000000000001"),
                    HouseId = demoHouseId,
                    Title = "Pollo con tomate y huevo",
                    Description = "Receta proteica y reconfortante para 2 personas.",
                    Servings = 2,
                    PrepTimeMinutes = 20,
                    ImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600",
                    Source = "KitchySystem",
                    InstructionsJson = @"[
                        {""Step"": 1, ""Title"": ""Cortar el pollo"", ""Text"": ""Corta los 500 g de pechuga de pollo en tiras o dados medianos y salpimienta al gusto."", ""TimeSeconds"": 180, ""Tip"": ""Usa una tabla limpia exclusiva para carnes.""},
                        {""Step"": 2, ""Title"": ""Dorar el pollo"", ""Text"": ""Pon una sartén a fuego medio-alto con un chorrito de aceite y dora el pollo durante 5 minutos."", ""TimeSeconds"": 300, ""Tip"": ""No muevas el pollo los dos primeros minutos para que dore bien.""},
                        {""Step"": 3, ""Title"": ""Añade el tomate y baja el fuego"", ""Text"": ""Vierte 390 g de tomate frito sobre el pollo dorado. Remueve y cocina a fuego suave durante 8 minutos."", ""TimeSeconds"": 480, ""Tip"": ""El pollo debe alcanzar 74 °C en el centro.""},
                        {""Step"": 4, ""Title"": ""Cascar los huevos"", ""Text"": ""Haz dos huecos en la salsa de tomate y casca los dos huevos directamente. Tapa la sartén."", ""TimeSeconds"": 240, ""Tip"": ""Cocina a fuego lento hasta que la clara cuaje.""},
                        {""Step"": 5, ""Title"": ""Emplatar y servir"", ""Text"": ""Retira del fuego con cuidado, espolvorea un poco de orégano o perejil picado y sirve caliente."", ""TimeSeconds"": 60, ""Tip"": ""Acompaña con pan tostado.""}
                    ]"
                };

                recipe.Ingredients.Add(new RecipeIngredient { Name = "Pechuga de pollo", Quantity = 500, Unit = "g" });
                recipe.Ingredients.Add(new RecipeIngredient { Name = "Tomate frito Hacendado", Quantity = 390, Unit = "g" });
                recipe.Ingredients.Add(new RecipeIngredient { Name = "Huevos L", Quantity = 2, Unit = "ud" });
                recipe.Ingredients.Add(new RecipeIngredient { Name = "Aceite de oliva virgen extra", Quantity = 15, Unit = "ml" });

                context.Recipes.Add(recipe);

                // Initial Seed Messages for House Social Chat
                context.HouseMessages.AddRange(
                    new HouseMessage
                    {
                        Id = Guid.Parse("e0000000-0000-0000-0000-000000000001"),
                        HouseId = demoHouseId,
                        SenderId = "jp",
                        MessageType = "TEXT",
                        Content = "¡Hola chavales! He organizado la despensa y añadido la compra semanal.",
                        CreatedAt = DateTime.UtcNow.AddHours(-3)
                    },
                    new HouseMessage
                    {
                        Id = Guid.Parse("e0000000-0000-0000-0000-000000000002"),
                        HouseId = demoHouseId,
                        SenderId = "jp",
                        MessageType = "SYSTEM_ACTION",
                        Content = "JP ha escaneado una compra y ha añadido 4 productos a la despensa",
                        ActionMetadataJson = System.Text.Json.JsonSerializer.Serialize(new
                        {
                            ActionType = "SCANNED_TICKET",
                            PerformedBy = "jp",
                            PerformedByName = "José Pablo",
                            TotalAdded = 4,
                            StoreName = "Mercadona",
                            AffectedProducts = new[]
                            {
                                new { ProductName = "Tomate frito Hacendado", Quantity = 2m, Unit = "ud", ImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200" },
                                new { ProductName = "Huevos L", Quantity = 6m, Unit = "ud", ImageUrl = "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200" },
                                new { ProductName = "Pechuga de pollo", Quantity = 500m, Unit = "g", ImageUrl = "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200" },
                                new { ProductName = "Leche entera", Quantity = 1m, Unit = "l", ImageUrl = "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200" }
                            }
                        }),
                        CreatedAt = DateTime.UtcNow.AddHours(-2)
                    },
                    new HouseMessage
                    {
                        Id = Guid.Parse("e0000000-0000-0000-0000-000000000003"),
                        HouseId = demoHouseId,
                        SenderId = "david",
                        MessageType = "TEXT",
                        Content = "¿Alguien va a cenar en casa? La pechuga de pollo caduca hoy.",
                        CreatedAt = DateTime.UtcNow.AddMinutes(-45)
                    }
                );

                await context.SaveChangesAsync();
            }
        }
    }
}

