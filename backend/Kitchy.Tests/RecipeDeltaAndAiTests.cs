using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Kitchy.API.Controllers;
using Kitchy.Core.DTOs;
using Kitchy.Core.Enums;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Implementations;
using Kitchy.Services.Interfaces;

namespace Kitchy.Tests
{
    public class RecipeDeltaAndAiTests
    {
        private readonly Guid _houseId = Guid.NewGuid();
        private readonly Guid _recipeId = Guid.NewGuid();
        private readonly string _userId = "aleja";

        [Fact]
        public async Task RecipeDeltaService_ClassifiesIngredients_IntoDisponiblePrioritarioAndFaltante()
        {
            // Arrange
            var mockRecipeRepo = new Mock<IRecipeRepository>();
            var mockInventoryRepo = new Mock<IInventoryRepository>();
            var mockShoppingRepo = new Mock<IShoppingListRepository>();

            var recipe = new Recipe
            {
                Id = _recipeId,
                Title = "Pollo con tomate y huevo",
                Ingredients = new List<RecipeIngredient>
                {
                    new() { Name = "Pechuga de pollo", Quantity = 500, Unit = "g" },
                    new() { Name = "Tomate frito Hacendado", Quantity = 390, Unit = "g" },
                    new() { Name = "Huevos L", Quantity = 2, Unit = "ud" },
                    new() { Name = "Queso rallado", Quantity = 50, Unit = "g" }
                }
            };

            // Pechuga de pollo: 500g disponible pero caduca en 20h -> PRIORITARIO
            // Tomate frito: 400g disponible y caduca en 30 días -> DISPONIBLE
            // Huevos L: 0 unidades -> FALTANTE
            // Queso rallado: 20g (faltan 30g) -> FALTANTE
            var inventory = new List<InventoryItem>
            {
                new()
                {
                    HouseId = _houseId,
                    Name = "Pechuga de pollo",
                    Quantity = 500,
                    Unit = "g",
                    ExpirationDate = DateTime.UtcNow.AddHours(20) // URGENTE (< 24h)
                },
                new()
                {
                    HouseId = _houseId,
                    Name = "Tomate frito Hacendado",
                    Quantity = 400,
                    Unit = "g",
                    ExpirationDate = DateTime.UtcNow.AddDays(30) // SEGURO
                },
                new()
                {
                    HouseId = _houseId,
                    Name = "Queso rallado",
                    Quantity = 20,
                    Unit = "g",
                    ExpirationDate = DateTime.UtcNow.AddDays(10)
                }
            };

            mockRecipeRepo.Setup(r => r.GetByIdAsync(_recipeId)).ReturnsAsync(recipe);
            mockInventoryRepo.Setup(i => i.GetByHouseAsync(_houseId)).ReturnsAsync(inventory);

            var deltaService = new RecipeDeltaService(mockRecipeRepo.Object, mockInventoryRepo.Object, mockShoppingRepo.Object);

            // Act
            var result = await deltaService.CalculateDeltaAsync(_houseId, _recipeId);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(4, result.TotalIngredientsCount);
            Assert.Equal(2, result.MissingIngredientsCount); // Huevos y Queso
            Assert.False(result.CanCookNow);
            Assert.Equal(50, result.PantryMatchPercentage); // 2 de 4 disponibles

            var polloDelta = result.Ingredients.First(i => i.Name == "Pechuga de pollo");
            Assert.Equal("Prioritario", polloDelta.Status);
            Assert.True(polloDelta.IsExpiringSoon);
            Assert.False(polloDelta.IsMissing);

            var tomateDelta = result.Ingredients.First(i => i.Name == "Tomate frito Hacendado");
            Assert.Equal("Disponible", tomateDelta.Status);
            Assert.False(tomateDelta.IsExpiringSoon);
            Assert.False(tomateDelta.IsMissing);

            var huevosDelta = result.Ingredients.First(i => i.Name == "Huevos L");
            Assert.Equal("Faltante", huevosDelta.Status);
            Assert.True(huevosDelta.IsMissing);
            Assert.Equal(2, huevosDelta.DeficitQuantity);

            var quesoDelta = result.Ingredients.First(i => i.Name == "Queso rallado");
            Assert.Equal("Faltante", quesoDelta.Status);
            Assert.True(quesoDelta.IsMissing);
            Assert.Equal(30, quesoDelta.DeficitQuantity);
        }

        [Fact]
        public async Task GeminiRecipeService_LocalHeuristicFallback_GuaranteesZero500ErrorsAndPrioritizesUrgent()
        {
            // Arrange: Simulamos que Gemini no tiene conexión o token falla
            var mockConfig = new Mock<IConfiguration>();
            mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty);

            var mockLogger = new Mock<ILogger<GeminiRecipeService>>();
            var httpClient = new HttpClient();

            var service = new GeminiRecipeService(httpClient, mockConfig.Object, mockLogger.Object);

            var pantry = new List<InventoryItem>
            {
                new()
                {
                    HouseId = _houseId,
                    Name = "Pechuga de pollo",
                    Quantity = 500,
                    Unit = "g",
                    ExpirationDate = DateTime.UtcNow.AddHours(20) // URGENTE
                },
                new()
                {
                    HouseId = _houseId,
                    Name = "Tomate frito Hacendado",
                    Quantity = 2,
                    Unit = "ud",
                    ExpirationDate = DateTime.UtcNow.AddDays(20)
                },
                new()
                {
                    HouseId = _houseId,
                    Name = "Huevos L",
                    Quantity = 6,
                    Unit = "ud",
                    ExpirationDate = DateTime.UtcNow.AddHours(40) // URGENTE
                }
            };

            // Act: Invocación garantizada en 0 ms
            var options = await service.GenerateRecipeOptionsAsync(_houseId, _userId, pantry, forceUrgentPriority: true, maxOptions: 3);

            // Assert
            Assert.NotNull(options);
            Assert.True(options.Count >= 2, "Debe generar al menos 2-3 opciones de recetas.");

            var mainRecipe = options.FirstOrDefault(r => r.Title.Contains("Pollo con tomate"));
            Assert.NotNull(mainRecipe);
            Assert.True(mainRecipe.PantryMatchPercentage > 0);
            Assert.Equal("AI_GENERATED", mainRecipe.SourceType);
            Assert.Contains("unsplash", mainRecipe.ImageUrl ?? "");

            // Verificar que los pasos contienen tiempos y consejos de seguridad alimentaria
            Assert.NotEmpty(mainRecipe.Steps);
            var stepWithSafetyTemp = mainRecipe.Steps.FirstOrDefault(s => s.Tip != null && s.Tip.Contains("74"));
            Assert.NotNull(stepWithSafetyTemp);
            Assert.Contains("74", stepWithSafetyTemp.Tip); // 74 °C en el centro del pollo
        }

        [Fact]
        public async Task RecipesController_CompleteCooking_DeductsInventoryAndNotifiesChat()
        {
            // Arrange
            var mockRecipeRepo = new Mock<IRecipeRepository>();
            var mockInventoryRepo = new Mock<IInventoryRepository>();
            var mockSocialService = new Mock<IHouseSocialService>();
            var mockUserRepo = new Mock<IUserRepository>();
            var mockGeminiService = new Mock<IGeminiRecipeService>();

            var recipe = new Recipe
            {
                Id = _recipeId,
                HouseId = _houseId,
                Title = "Pollo con tomate y huevo",
                Ingredients = new List<RecipeIngredient>
                {
                    new() { Name = "Pechuga de pollo", Quantity = 500, Unit = "g" },
                    new() { Name = "Huevos L", Quantity = 2, Unit = "ud" }
                }
            };

            var chickenItem = new InventoryItem
            {
                Id = Guid.NewGuid(),
                HouseId = _houseId,
                Name = "Pechuga de pollo",
                Quantity = 500,
                Unit = "g",
                ExpirationDate = DateTime.UtcNow.AddDays(1)
            };

            var eggsItem = new InventoryItem
            {
                Id = Guid.NewGuid(),
                HouseId = _houseId,
                Name = "Huevos L",
                Quantity = 6,
                Unit = "ud",
                ExpirationDate = DateTime.UtcNow.AddDays(2)
            };

            var inventory = new List<InventoryItem> { chickenItem, eggsItem };

            mockRecipeRepo.Setup(r => r.GetByIdAsync(_recipeId)).ReturnsAsync(recipe);
            mockInventoryRepo.Setup(i => i.GetByHouseAsync(_houseId)).ReturnsAsync(inventory);
            mockUserRepo.Setup(u => u.GetByIdAsync(_userId)).ReturnsAsync(new User { Id = _userId, FullName = "Alejandro Gallardo" });

            var recipeService = new RecipeService(
                mockRecipeRepo.Object,
                mockInventoryRepo.Object,
                mockUserRepo.Object,
                mockSocialService.Object
            );

            var controller = new RecipesController(
                recipeService,
                mockGeminiService.Object,
                mockInventoryRepo.Object,
                mockSocialService.Object,
                mockUserRepo.Object
            );

            // Simular usuario autenticado en el contexto de controller
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, _userId),
                        new Claim("house_id", _houseId.ToString())
                    }, "mock"))
                }
            };

            // Act
            var actionResult = await controller.CompleteCooking(_recipeId, _houseId, new CompleteCookingRequestDto(1));

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var resultDto = Assert.IsType<CompleteCookingResultDto>(okResult.Value);

            Assert.Equal(_recipeId, resultDto.RecipeId);
            Assert.Contains("ha cocinado 'Pollo con tomate y huevo'", resultDto.ChatNotificationMessage);
            Assert.Equal(2, resultDto.ItemsDeductedCount);

            // Verificar que el pollo se eliminó (quedó a 0) y los huevos se actualizaron a 4
            mockInventoryRepo.Verify(i => i.DeleteAsync(chickenItem.Id, _houseId), Times.Once);
            mockInventoryRepo.Verify(i => i.UpdateAsync(It.Is<InventoryItem>(x => x.Id == eggsItem.Id && x.Quantity == 4)), Times.Once);

            // Verificar que se envió el mensaje al chat del hogar
            mockSocialService.Verify(s => s.PostMessageAsync(
                _houseId,
                _userId,
                It.Is<CreateHouseMessageDto>(m => m.MessageType == "SYSTEM_ACTION" && m.Content.Contains("Modo Cocina Manos Libres"))
            ), Times.Once);
        }
    }
}
