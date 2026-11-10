using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using Kitchy.API.Controllers;
using Kitchy.API.Hubs;
using Kitchy.Core.DTOs;
using Kitchy.Core.Models;
using Kitchy.Infrastructure.Data;
using Kitchy.Infrastructure.Repositories;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class DataIsolationTests
    {
        private (KitchyDbContext context, HouseRepository houseRepo, InventoryRepository inventoryRepo, InventoryService inventoryService) CreateTestContext()
        {
            var options = new DbContextOptionsBuilder<KitchyDbContext>()
                .UseInMemoryDatabase(databaseName: $"KitchyIsolationTestDb_{Guid.NewGuid()}")
                .Options;

            var context = new KitchyDbContext(options);
            var houseRepo = new HouseRepository(context);
            var inventoryRepo = new InventoryRepository(context);
            var masterProductRepo = new MasterProductRepository(context);
            var shoppingListRepo = new ShoppingListRepository(context);
            var priceHistoryRepo = new PriceHistoryRepository(context);

            var inventoryService = new InventoryService(
                inventoryRepo,
                shoppingListRepo,
                masterProductRepo
            );

            return (context, houseRepo, inventoryRepo, inventoryService);
        }

        private InventoryController CreateInventoryController(
            string userId,
            InventoryService inventoryService,
            HouseRepository houseRepo)
        {
            var mockHubContext = new Mock<IHubContext<KitchyHub, IKitchyClient>>();
            var mockClients = new Mock<IHubClients<IKitchyClient>>();
            var mockClientProxy = new Mock<IKitchyClient>();
            mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
            mockHubContext.Setup(h => h.Clients).Returns(mockClients.Object);

            var controller = new InventoryController(inventoryService, houseRepo, mockHubContext.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("sub", userId),
            }, "TestAuth"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };

            return controller;
        }

        private HousesController CreateHousesController(
            string userId,
            HouseRepository houseRepo)
        {
            var controller = new HousesController(houseRepo);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("sub", userId),
            }, "TestAuth"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };

            return controller;
        }

        [Fact]
        public async Task UserA_CannotAccessInventory_OfHouseB_ReturnsForbid()
        {
            // GIVEN: Casa A de Usuario A y Casa B de Usuario B
            var (context, houseRepo, inventoryRepo, inventoryService) = CreateTestContext();

            var houseA = await houseRepo.CreateHouseAsync(new House
            {
                Name = "Casa de Usuario A",
                InviteCode = "CASA_A"
            }, "usuario_a");

            var houseB = await houseRepo.CreateHouseAsync(new House
            {
                Name = "Casa de Usuario B (Privada)",
                InviteCode = "CASA_B"
            }, "usuario_b");

            // Añadimos alimentos secretos en la Casa B
            await inventoryRepo.AddAsync(new InventoryItem
            {
                HouseId = houseB.Id,
                Name = "Alimento Confidencial Casa B",
                Quantity = 1,
                Unit = "ud",
                ExpirationDate = DateTime.UtcNow.AddDays(10),
                AddedByUserId = "usuario_b"
            });

            // WHEN: Usuario A intenta acceder al inventario de la Casa B
            var controllerUserA = CreateInventoryController("usuario_a", inventoryService, houseRepo);
            var result = await controllerUserA.GetInventory(houseB.Id);

            // THEN: El sistema deniega el acceso con 403 Forbid (Blindaje RLS)
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task UserA_CanAccessInventory_OfTheirOwnHouse_ReturnsOk()
        {
            // GIVEN: Casa A con inventario de Usuario A
            var (context, houseRepo, inventoryRepo, inventoryService) = CreateTestContext();

            var houseA = await houseRepo.CreateHouseAsync(new House
            {
                Name = "Casa Propia de Usuario A",
                InviteCode = "CASA_A"
            }, "usuario_a");

            await inventoryRepo.AddAsync(new InventoryItem
            {
                HouseId = houseA.Id,
                Name = "Leche Entera",
                Quantity = 2,
                Unit = "l",
                ExpirationDate = DateTime.UtcNow.AddDays(7),
                AddedByUserId = "usuario_a"
            });

            // WHEN: Usuario A consulta su propia casa
            var controllerUserA = CreateInventoryController("usuario_a", inventoryService, houseRepo);
            var result = await controllerUserA.GetInventory(houseA.Id);

            // THEN: Retorna Ok con los alimentos del hogar propio
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var items = Assert.IsAssignableFrom<List<InventoryItemDto>>(okResult.Value);
            Assert.Single(items);
            Assert.Equal("Leche Entera", items[0].Name);
        }

        [Fact]
        public async Task UserA_JoinsHouseB_WithJoinCode_ThenGainsAccess()
        {
            // GIVEN: Casa B con código alfanumérico
            var (context, houseRepo, inventoryRepo, inventoryService) = CreateTestContext();

            var houseB = await houseRepo.CreateHouseAsync(new House
            {
                Name = "Piso Compartido",
                InviteCode = "K7A9B2"
            }, "usuario_b");

            await inventoryRepo.AddAsync(new InventoryItem
            {
                HouseId = houseB.Id,
                Name = "Tomate Frito",
                Quantity = 3,
                Unit = "ud",
                ExpirationDate = DateTime.UtcNow.AddDays(20),
                AddedByUserId = "usuario_b"
            });

            // Usuario A inicialmente no puede acceder
            var inventoryControllerA = CreateInventoryController("usuario_a", inventoryService, houseRepo);
            var forbidResult = await inventoryControllerA.GetInventory(houseB.Id);
            Assert.IsType<ForbidResult>(forbidResult.Result);

            // WHEN: Usuario A se une a la Casa B usando el código alfanumérico / QR
            var housesControllerA = CreateHousesController("usuario_a", houseRepo);
            var joinResult = await housesControllerA.JoinHouse(new JoinHouseDto(InviteCode: "k7a9b2")); // Test case-insensitive

            var okJoin = Assert.IsType<OkObjectResult>(joinResult.Result);
            var joinedHouse = Assert.IsType<HouseDto>(okJoin.Value);
            Assert.Equal(houseB.Id, joinedHouse.Id);

            // THEN: Usuario A ahora tiene acceso legítimo al inventario de Casa B
            var secondAttempt = await inventoryControllerA.GetInventory(houseB.Id);
            var okResult = Assert.IsType<OkObjectResult>(secondAttempt.Result);
            var items = Assert.IsAssignableFrom<List<InventoryItemDto>>(okResult.Value);
            Assert.Single(items);
            Assert.Equal("Tomate Frito", items[0].Name);
        }

        [Fact]
        public async Task InventoryUpdateAndDelete_EnforcesHouseSecurity_ReturnsForbidForUnauthorizedUser()
        {
            // GIVEN: Casa X del usuario X con un alimento
            var (context, houseRepo, inventoryRepo, inventoryService) = CreateTestContext();

            var houseX = await houseRepo.CreateHouseAsync(new House
            {
                Name = "Casa Privada X",
                InviteCode = "SECURE1"
            }, "usuario_x");

            var item = await inventoryRepo.AddAsync(new InventoryItem
            {
                HouseId = houseX.Id,
                Name = "Pechuga de Pollo",
                Quantity = 2,
                Unit = "ud",
                ExpirationDate = DateTime.UtcNow.AddDays(3),
                AddedByUserId = "usuario_x"
            });

            // GIVEN: Usuario Intruso (no pertenece a Casa X)
            var intrusoController = CreateInventoryController("usuario_intruso", inventoryService, houseRepo);

            // WHEN: Usuario Intruso intenta actualizar cantidad mediante PUT /api/inventory/{id}
            var updateResult = await intrusoController.UpdateItem(item.Id, houseX.Id, new UpdateInventoryItemDto(Quantity: 1));
            Assert.IsType<ForbidResult>(updateResult.Result);

            // WHEN: Usuario Intruso intenta actualizar mediante POST /api/inventory/update
            var updateGenericResult = await intrusoController.UpdateItemGeneric(new UpdateInventoryItemDto(ItemId: item.Id, HouseId: houseX.Id, Quantity: 0));
            Assert.IsType<ForbidResult>(updateGenericResult.Result);

            // WHEN: Usuario Intruso intenta eliminar mediante DELETE /api/inventory/{id}
            var deleteResult = await intrusoController.DeleteItem(item.Id, houseX.Id);
            Assert.IsType<ForbidResult>(deleteResult);

            // GIVEN: Usuario Legítimo X
            var ownerController = CreateInventoryController("usuario_x", inventoryService, houseRepo);

            // WHEN: Usuario Legítimo actualiza cantidad a 1
            var legitUpdate = await ownerController.UpdateItem(item.Id, houseX.Id, new UpdateInventoryItemDto(Quantity: 1));
            var okUpdated = Assert.IsType<OkObjectResult>(legitUpdate.Result);
            var updatedDto = Assert.IsType<InventoryItemDto>(okUpdated.Value);
            Assert.Equal(1, updatedDto.Quantity);

            // WHEN: Usuario Legítimo elimina el producto
            var legitDelete = await ownerController.DeleteItem(item.Id, houseX.Id);
            Assert.IsType<NoContentResult>(legitDelete);
        }
    }
}
