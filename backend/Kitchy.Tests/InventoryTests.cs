using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Moq;
using Xunit;
using Kitchy.Core.DTOs;
using Kitchy.Core.Enums;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class InventoryTests
    {
        private readonly Mock<IInventoryRepository> _mockInventoryRepo;
        private readonly Mock<IShoppingListRepository> _mockShoppingRepo;
        private readonly Mock<IMasterProductRepository> _mockMasterRepo;
        private readonly InventoryService _inventoryService;
        private readonly Guid _houseId = Guid.NewGuid();

        public InventoryTests()
        {
            _mockInventoryRepo = new Mock<IInventoryRepository>();
            _mockShoppingRepo = new Mock<IShoppingListRepository>();
            _mockMasterRepo = new Mock<IMasterProductRepository>();

            _inventoryService = new InventoryService(
                _mockInventoryRepo.Object,
                _mockShoppingRepo.Object,
                _mockMasterRepo.Object
            );
        }

        [Fact]
        public void UrgencyLevel_CalculatesCorrectTrafficLightColors()
        {
            // Red: <= 24 hours
            var redItem = new InventoryItem
            {
                Name = "Pechuga de pollo",
                ExpirationDate = DateTime.UtcNow.AddHours(20)
            };
            Assert.Equal(ItemUrgency.Red, redItem.UrgencyLevel);

            // Amber: 24h - 48h
            var amberItem = new InventoryItem
            {
                Name = "Huevos L",
                ExpirationDate = DateTime.UtcNow.AddHours(36)
            };
            Assert.Equal(ItemUrgency.Amber, amberItem.UrgencyLevel);

            // Green: > 48h
            var greenItem = new InventoryItem
            {
                Name = "Tomate frito",
                ExpirationDate = DateTime.UtcNow.AddDays(15)
            };
            Assert.Equal(ItemUrgency.Green, greenItem.UrgencyLevel);
        }

        [Fact]
        public async Task DiscardAndAddToShoppingList_DecrementsInventoryAndAddsToShoppingList()
        {
            // Arrange
            var barcode = "8480000412890";
            var masterProduct = new MasterProduct
            {
                Id = Guid.NewGuid(),
                Name = "Leche entera",
                Barcode = barcode,
                DefaultUnit = "l"
            };

            var existingItem = new InventoryItem
            {
                Id = Guid.NewGuid(),
                HouseId = _houseId,
                MasterProductId = masterProduct.Id,
                Name = "Leche entera",
                Quantity = 1,
                Unit = "l",
                ExpirationDate = DateTime.UtcNow.AddDays(2)
            };

            _mockMasterRepo.Setup(m => m.GetByBarcodeAsync(barcode)).ReturnsAsync(masterProduct);
            _mockInventoryRepo.Setup(i => i.GetByHouseAsync(_houseId)).ReturnsAsync(new List<InventoryItem> { existingItem });
            _mockInventoryRepo.Setup(i => i.DeleteAsync(existingItem.Id, _houseId)).ReturnsAsync(true);
            _mockShoppingRepo.Setup(s => s.AddAsync(It.IsAny<ShoppingListItem>())).ReturnsAsync((ShoppingListItem s) => s);

            // Act
            var result = await _inventoryService.DiscardAndAddToShoppingListAsync(_houseId, "aleja", barcode);

            // Assert
            Assert.True(result);
            _mockInventoryRepo.Verify(i => i.DeleteAsync(existingItem.Id, _houseId), Times.Once);
            _mockShoppingRepo.Verify(s => s.AddAsync(It.Is<ShoppingListItem>(it =>
                it.Name == "Leche entera" &&
                it.Source == ItemSource.Barcode.ToString() &&
                it.HouseId == _houseId
            )), Times.Once);
        }

        [Theory]
        [InlineData("<script>alert('xss')</script>Pechuga de pollo", "Pechuga de pollo")]
        [InlineData("<img src=x onerror=alert(1)>Tomate Frito", "Tomate Frito")]
        [InlineData("javascript:evil();Huevos Camperos", "Huevos Camperos")]
        [InlineData("<style>body{display:none}</style>Pan de molde", "Pan de molde")]
        public async Task AddItemAsync_SanitizesXssPayloadsInProductName(string maliciousName, string expectedClean)
        {
            // Arrange
            InventoryItem? capturedItem = null;
            _mockInventoryRepo
                .Setup(r => r.AddAsync(It.IsAny<InventoryItem>()))
                .Callback<InventoryItem>(item => capturedItem = item)
                .ReturnsAsync((InventoryItem item) => item);

            var dto = new CreateInventoryItemDto(
                Name: maliciousName,
                Quantity: 1,
                Unit: "<script>kg</script>",
                ExpirationDate: DateTime.UtcNow.AddDays(7),
                Location: "<img onerror=alert(1)>Nevera",
                Price: 2.50m,
                Barcode: null,
                ImageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"
            );

            // Act
            var result = await _inventoryService.AddItemAsync(_houseId, "user-test-123", dto);

            // Assert
            Assert.NotNull(capturedItem);
            Assert.DoesNotContain("<script", capturedItem!.Name, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onerror=", capturedItem.Name, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("javascript:", capturedItem.Name, StringComparison.OrdinalIgnoreCase);
            Assert.Contains(expectedClean, capturedItem.Name);

            // Assert unit and location are also sanitized
            Assert.DoesNotContain("<script", capturedItem.Unit, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onerror=", capturedItem.Location, StringComparison.OrdinalIgnoreCase);

            // Assert ImageUrl is preserved
            Assert.Equal("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200", result.ImageUrl);
        }
    }
}

