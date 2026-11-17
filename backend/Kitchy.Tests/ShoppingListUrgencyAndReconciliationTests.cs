using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Kitchy.Core.DTOs;
using Kitchy.Core.Models;
using Kitchy.Infrastructure.Data;
using Kitchy.Infrastructure.Repositories;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class ShoppingListUrgencyAndReconciliationTests
    {
        private KitchyDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<KitchyDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new KitchyDbContext(options);
        }

        [Theory]
        [InlineData("LECHE ENTERA 1 L", "Leche hacendado", true)]
        [InlineData("PECHUGA POLLO 500G", "Pechuga de pollo", true)]
        [InlineData("Tomate Frito Carrefour 3x", "tomate frito", true)]
        [InlineData("HUEVOS CAMPEROS L", "Huevos docena", true)]
        [InlineData("PAPEL HIGIENICO", "Detergente lavadora", false)]
        [InlineData("MANZANA GOLDEN", "Platanos de canarias", false)]
        public void IsFuzzyMatch_Normalizes_Accents_Brands_And_Units(string ticketText, string shoppingItemText, bool expected)
        {
            var match = ShoppingListService.IsFuzzyMatch(ticketText, shoppingItemText);
            Assert.Equal(expected, match);
        }

        [Fact]
        public async Task ReconcileWithScannedProductsAsync_MatchesAndRemoves_AndDeactivatesUrgentMode_WhenListCleared()
        {
            var context = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();
            var userId = "user_reconcile_test";

            var user = new User
            {
                Id = userId,
                Email = "reconcile@test.com",
                FullName = "Alejandro Test",
                PasswordHash = "hash"
            };
            context.Users.Add(user);

            var house = new House
            {
                Id = houseId,
                Name = "Casa Test",
                CreatedAt = DateTime.UtcNow,
                IsUrgent = true,
                UrgentModeSource = "MANUAL",
                UrgentUpdatedAt = DateTime.UtcNow
            };
            context.Houses.Add(house);

            context.UserHouses.Add(new UserHouse
            {
                HouseId = houseId,
                UserId = userId,
                Role = "Owner"
            });

            var item1 = new ShoppingListItem
            {
                Id = Guid.NewGuid(),
                HouseId = houseId,
                Name = "Leche hacendado",
                Quantity = 2,
                Unit = "ud",
                IsChecked = false,
                Source = "MANUAL",
                AddedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            var item2 = new ShoppingListItem
            {
                Id = Guid.NewGuid(),
                HouseId = houseId,
                Name = "Pechuga de pollo",
                Quantity = 1,
                Unit = "ud",
                IsChecked = false,
                Source = "MANUAL",
                AddedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            context.ShoppingList.AddRange(item1, item2);
            await context.SaveChangesAsync();

            var houseRepo = new HouseRepository(context);
            var shoppingRepo = new ShoppingListRepository(context);
            var inventoryRepo = new InventoryRepository(context);
            var messageRepo = new HouseMessageRepository(context);
            var userRepo = new UserRepository(context);
            var notifier = new MockHouseCollaborationNotifier();

            var service = new ShoppingListService(
                shoppingRepo,
                houseRepo,
                inventoryRepo,
                notifier,
                messageRepo,
                userRepo
            );

            // Simulamos ticket escaneado con "LECHE ENTERA 1 L" y "PECHUGA POLLO 500 G"
            var scannedProducts = new List<DetectedProductDto>
            {
                new DetectedProductDto("LECHE ENTERA 1 L", 2, "ud", 0.90m, 1.80m, null, "Lácteos"),
                new DetectedProductDto("PECHUGA POLLO 500 G", 1, "ud", 4.50m, 4.50m, null, "Carne")
            };

            var result = await service.ReconcileWithScannedProductsAsync(houseId, userId, scannedProducts);

            Assert.Equal(2, result.ReconciledCount);
            Assert.Contains("Leche hacendado", result.ReconciledItemNames);
            Assert.Contains("Pechuga de pollo", result.ReconciledItemNames);
            Assert.False(result.IsUrgent);
            Assert.Equal(0, result.RemainingCount);

            // Verificar que los items se eliminaron de la base de datos
            var remainingItems = await shoppingRepo.GetByHouseAsync(houseId);
            Assert.Empty(remainingItems);

            // Verificar que el modo urgente del hogar se desactivó
            var updatedHouse = await houseRepo.GetByIdAsync(houseId);
            Assert.NotNull(updatedHouse);
            Assert.False(updatedHouse.IsUrgent);
            Assert.Equal("NONE", updatedHouse.UrgentModeSource);

            // Verificar que se emitió mensaje SYSTEM_ACTION al chat del hogar
            var messages = await messageRepo.GetMessagesAsync(houseId, null, 10);
            var systemAction = messages.FirstOrDefault(m => m.MessageType == "SYSTEM_ACTION");
            Assert.NotNull(systemAction);
            Assert.Contains("completado la compra urgente", systemAction.Content);
        }

        [Fact]
        public async Task EvaluateAutomaticUrgencyAsync_ActivatesUrgency_WhenFiveOrMoreItemsPending()
        {
            var context = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();
            var userId = "user_auto_urgency";

            var house = new House
            {
                Id = houseId,
                Name = "Casa Auto Urgencia",
                CreatedAt = DateTime.UtcNow,
                IsUrgent = false,
                UrgentModeSource = "NONE"
            };
            context.Houses.Add(house);

            for (int i = 0; i < 5; i++)
            {
                context.ShoppingList.Add(new ShoppingListItem
                {
                    Id = Guid.NewGuid(),
                    HouseId = houseId,
                    Name = $"Item {i}",
                    Quantity = 1,
                    Unit = "ud",
                    IsChecked = false,
                    Source = "MANUAL",
                    AddedByUserId = userId,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await context.SaveChangesAsync();

            var houseRepo = new HouseRepository(context);
            var shoppingRepo = new ShoppingListRepository(context);
            var inventoryRepo = new InventoryRepository(context);
            var notifier = new MockHouseCollaborationNotifier();

            var service = new ShoppingListService(
                shoppingRepo,
                houseRepo,
                inventoryRepo,
                notifier,
                null,
                null
            );

            var status = await service.EvaluateAutomaticUrgencyAsync(houseId);

            Assert.True(status.IsUrgent);
            Assert.Equal("AUTO_LOW_STOCK", status.UrgentModeSource);
            Assert.Equal(5, status.PendingCount);

            var updatedHouse = await houseRepo.GetByIdAsync(houseId);
            Assert.NotNull(updatedHouse);
            Assert.True(updatedHouse.IsUrgent);
            Assert.Equal("AUTO_LOW_STOCK", updatedHouse.UrgentModeSource);
            Assert.Contains(notifier.BroadcastUrgencies, u => u.IsUrgent && u.UrgentModeSource == "AUTO_LOW_STOCK");
        }

        [Fact]
        public async Task SetUrgencyStatusAsync_ManualToggle_UpdatesHouseAndBroadcasts()
        {
            var context = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();

            var house = new House
            {
                Id = houseId,
                Name = "Casa Manual Urgencia",
                CreatedAt = DateTime.UtcNow,
                IsUrgent = false,
                UrgentModeSource = "NONE"
            };
            context.Houses.Add(house);
            await context.SaveChangesAsync();

            var houseRepo = new HouseRepository(context);
            var shoppingRepo = new ShoppingListRepository(context);
            var notifier = new MockHouseCollaborationNotifier();

            var service = new ShoppingListService(
                shoppingRepo,
                houseRepo,
                null,
                notifier,
                null,
                null
            );

            var status = await service.SetUrgencyStatusAsync(houseId, true, "MANUAL");

            Assert.True(status.IsUrgent);
            Assert.Equal("MANUAL", status.UrgentModeSource);

            var updatedHouse = await houseRepo.GetByIdAsync(houseId);
            Assert.NotNull(updatedHouse);
            Assert.True(updatedHouse.IsUrgent);
            Assert.Equal("MANUAL", updatedHouse.UrgentModeSource);
            Assert.Single(notifier.BroadcastUrgencies);
            Assert.True(notifier.BroadcastUrgencies[0].IsUrgent);
        }
    }
}
