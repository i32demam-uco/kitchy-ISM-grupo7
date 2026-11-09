using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Moq;
using Xunit;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class DeltaAlgorithmTests
    {
        private readonly Mock<IRecipeRepository> _mockRecipeRepo;
        private readonly Mock<IInventoryRepository> _mockInventoryRepo;
        private readonly Mock<IShoppingListRepository> _mockShoppingRepo;
        private readonly DeltaService _deltaService;
        private readonly Guid _houseId = Guid.NewGuid();
        private readonly Guid _recipeId = Guid.NewGuid();

        public DeltaAlgorithmTests()
        {
            _mockRecipeRepo = new Mock<IRecipeRepository>();
            _mockInventoryRepo = new Mock<IInventoryRepository>();
            _mockShoppingRepo = new Mock<IShoppingListRepository>();

            _deltaService = new DeltaService(
                _mockRecipeRepo.Object,
                _mockInventoryRepo.Object,
                _mockShoppingRepo.Object
            );
        }

        [Fact]
        public async Task CalculateDelta_WhenPantryHasPartialStock_CalculatesExactDeficit()
        {
            // Arrange: Recipe requires 500g Chicken and 390g Tomate frito
            var recipe = new Recipe
            {
                Id = _recipeId,
                Title = "Pollo con tomate",
                Ingredients = new List<RecipeIngredient>
                {
                    new() { Name = "Pechuga de pollo", Quantity = 500, Unit = "g" },
                    new() { Name = "Tomate frito Hacendado", Quantity = 390, Unit = "g" }
                }
            };

            // Pantry has only 300g Chicken and 0g Tomate
            var inventory = new List<InventoryItem>
            {
                new() { HouseId = _houseId, Name = "Pechuga de pollo", Quantity = 300, Unit = "g", ExpirationDate = DateTime.UtcNow.AddDays(2) }
            };

            _mockRecipeRepo.Setup(r => r.GetByIdAsync(_recipeId)).ReturnsAsync(recipe);
            _mockInventoryRepo.Setup(i => i.GetByHouseAsync(_houseId)).ReturnsAsync(inventory);

            // Act
            var result = await _deltaService.CalculateDeltaAsync(_houseId, _recipeId);

            // Assert
            Assert.NotNull(result);
            Assert.False(result.CanCookNow);
            Assert.Equal(2, result.MissingIngredientsCount);

            var chicken = result.Ingredients.First(i => i.Name.Contains("pollo", StringComparison.OrdinalIgnoreCase));
            Assert.Equal(500, chicken.RequiredQuantity);
            Assert.Equal(300, chicken.AvailableQuantity);
            Assert.Equal(200, chicken.DeficitQuantity);
            Assert.True(chicken.IsMissing);

            var tomato = result.Ingredients.First(i => i.Name.Contains("tomate", StringComparison.OrdinalIgnoreCase));
            Assert.Equal(390, tomato.RequiredQuantity);
            Assert.Equal(0, tomato.AvailableQuantity);
            Assert.Equal(390, tomato.DeficitQuantity);
            Assert.True(tomato.IsMissing);
        }

        [Fact]
        public async Task CalculateDelta_WhenPantryHasFullStock_ReturnsCanCookNowTrue()
        {
            // Arrange
            var recipe = new Recipe
            {
                Id = _recipeId,
                Title = "Huevos fritos",
                Ingredients = new List<RecipeIngredient>
                {
                    new() { Name = "Huevos L", Quantity = 2, Unit = "ud" }
                }
            };

            var inventory = new List<InventoryItem>
            {
                new() { HouseId = _houseId, Name = "Huevos L", Quantity = 6, Unit = "ud", ExpirationDate = DateTime.UtcNow.AddDays(3) }
            };

            _mockRecipeRepo.Setup(r => r.GetByIdAsync(_recipeId)).ReturnsAsync(recipe);
            _mockInventoryRepo.Setup(i => i.GetByHouseAsync(_houseId)).ReturnsAsync(inventory);

            // Act
            var result = await _deltaService.CalculateDeltaAsync(_houseId, _recipeId);

            // Assert
            Assert.True(result.CanCookNow);
            Assert.Equal(0, result.MissingIngredientsCount);
            Assert.Equal(0, result.Ingredients[0].DeficitQuantity);
            Assert.False(result.Ingredients[0].IsMissing);
        }

        [Fact]
        public async Task SendDeltaToShoppingList_AddsMissingItemsCollaboratively()
        {
            // Arrange
            var recipe = new Recipe
            {
                Id = _recipeId,
                Title = "Tortilla",
                Ingredients = new List<RecipeIngredient>
                {
                    new() { Name = "Huevos L", Quantity = 4, Unit = "ud" },
                    new() { Name = "Patatas", Quantity = 500, Unit = "g" }
                }
            };

            // Empty pantry
            _mockRecipeRepo.Setup(r => r.GetByIdAsync(_recipeId)).ReturnsAsync(recipe);
            _mockInventoryRepo.Setup(i => i.GetByHouseAsync(_houseId)).ReturnsAsync(new List<InventoryItem>());

            _mockShoppingRepo.Setup(s => s.AddRangeAsync(It.IsAny<IEnumerable<ShoppingListItem>>()))
                .ReturnsAsync((IEnumerable<ShoppingListItem> items) => items.ToList());

            var request = new SendDeltaToShoppingListRequest(_recipeId, null);

            // Act
            var response = await _deltaService.SendDeltaToShoppingListAsync(_houseId, "aleja", request);

            // Assert
            Assert.Equal(2, response.ItemsAddedCount);
            Assert.All(response.AddedItems, item =>
            {
                Assert.Equal("RecipeDelta", item.Source);
                Assert.Equal(_houseId, item.HouseId);
                Assert.False(item.IsChecked);
            });
        }
    }
}

