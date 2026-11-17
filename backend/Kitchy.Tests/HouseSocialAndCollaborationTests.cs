using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Core.Security;
using Kitchy.Infrastructure.Data;
using Kitchy.Infrastructure.Repositories;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class MockHouseCollaborationNotifier : IHouseCollaborationNotifier
    {
        public List<HouseMessageDto> BroadcastMessages { get; } = new();
        public List<InventoryDeltaDto> BroadcastDeltas { get; } = new();
        public List<List<HouseMemberPresenceDto>> BroadcastPresences { get; } = new();
        public List<ShoppingListUrgencyStatusDto> BroadcastUrgencies { get; } = new();
        public List<ReconciliationResultDto> BroadcastReconciliations { get; } = new();

        public Task BroadcastChatMessageAsync(Guid houseId, HouseMessageDto message)
        {
            BroadcastMessages.Add(message);
            return Task.CompletedTask;
        }

        public Task BroadcastInventoryDeltaAsync(Guid houseId, InventoryDeltaDto delta)
        {
            BroadcastDeltas.Add(delta);
            return Task.CompletedTask;
        }

        public Task BroadcastMemberPresenceAsync(Guid houseId, List<HouseMemberPresenceDto> members)
        {
            BroadcastPresences.Add(members);
            return Task.CompletedTask;
        }

        public Task BroadcastShoppingListUrgencyChangedAsync(Guid houseId, ShoppingListUrgencyStatusDto status)
        {
            BroadcastUrgencies.Add(status);
            return Task.CompletedTask;
        }

        public Task BroadcastShoppingListReconciledAsync(Guid houseId, ReconciliationResultDto result)
        {
            BroadcastReconciliations.Add(result);
            return Task.CompletedTask;
        }
    }

    public class HouseSocialAndCollaborationTests
    {
        private KitchyDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<KitchyDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new KitchyDbContext(options);
        }

        [Fact]
        public async Task ConsumeItemAsync_DecrementsStock_PersistsSystemAction_AndBroadcastsDeltaAndChat()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();
            var userId = "aleja";

            var user = new User { Id = userId, Email = "aleja@uco.es", FullName = "Alejandro Gallardo", PasswordHash = "hash" };
            db.Users.Add(user);

            var house = new House { Id = houseId, Name = "Piso Ciudad Jardín", InviteCode = "UCO123" };
            db.Houses.Add(house);
            db.UserHouses.Add(new UserHouse { HouseId = houseId, UserId = userId, Role = "Admin" });

            var item = new InventoryItem
            {
                Id = Guid.NewGuid(),
                HouseId = houseId,
                Name = "Huevos L",
                Quantity = 6,
                Unit = "ud",
                ExpirationDate = DateTime.UtcNow.AddDays(2),
                AddedByUserId = userId
            };
            db.Inventory.Add(item);
            await db.SaveChangesAsync();

            var invRepo = new InventoryRepository(db);
            var shopRepo = new ShoppingListRepository(db);
            var masterRepo = new MasterProductRepository(db);
            var messageRepo = new HouseMessageRepository(db);
            var userRepo = new UserRepository(db);
            var notifier = new MockHouseCollaborationNotifier();

            var invService = new InventoryService(invRepo, shopRepo, masterRepo, notifier, userRepo, messageRepo);

            // Act - Alejandro consumes 2 eggs
            var result = await invService.ConsumeItemAsync(houseId, userId, item.Id, 2);

            // Assert
            Assert.NotNull(result);
            Assert.Equal(4, result.Quantity);

            // Verify SYSTEM_ACTION saved in DB
            var messages = await messageRepo.GetMessagesAsync(houseId, null);
            Assert.Single(messages);
            var systemMsg = messages.First();
            Assert.Equal("SYSTEM_ACTION", systemMsg.MessageType);
            Assert.Contains("Alejandro Gallardo ha gastado 2 ud de Huevos L", systemMsg.Content);

            // Verify SignalR Broadcasts
            Assert.Single(notifier.BroadcastDeltas);
            Assert.Equal("CONSUMED", notifier.BroadcastDeltas[0].Action);
            Assert.Equal(4, notifier.BroadcastDeltas[0].NewQuantity);
            Assert.Equal(-2, notifier.BroadcastDeltas[0].QuantityDelta);

            Assert.Single(notifier.BroadcastMessages);
            Assert.Equal("SYSTEM_ACTION", notifier.BroadcastMessages[0].MessageType);
            Assert.Equal("CONSUMED", notifier.BroadcastMessages[0].ActionMetadata?.ActionType);
            Assert.Equal(4, notifier.BroadcastMessages[0].ActionMetadata?.StockRemaining);
        }

        [Fact]
        public async Task AddBatchFromScanAsync_PersistsItems_SavesScannedTicketSystemAction_AndBroadcasts()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();
            var userId = "jp";

            var user = new User { Id = userId, Email = "jp@uco.es", FullName = "José Pablo", PasswordHash = "hash" };
            db.Users.Add(user);
            var house = new House { Id = houseId, Name = "Piso Ciudad Jardín", InviteCode = "UCO123" };
            db.Houses.Add(house);
            db.UserHouses.Add(new UserHouse { HouseId = houseId, UserId = userId, Role = "Member" });
            await db.SaveChangesAsync();

            var invRepo = new InventoryRepository(db);
            var shopRepo = new ShoppingListRepository(db);
            var masterRepo = new MasterProductRepository(db);
            var messageRepo = new HouseMessageRepository(db);
            var userRepo = new UserRepository(db);
            var notifier = new MockHouseCollaborationNotifier();

            var invService = new InventoryService(invRepo, shopRepo, masterRepo, notifier, userRepo, messageRepo);

            var scannedProducts = new List<DetectedProductDto>
            {
                new("Tomate frito Hacendado", 2, "ud", 0.85m, 1.70m, DateTime.UtcNow.AddDays(30), "Conservas"),
                new("Leche entera", 1, "l", 1.05m, 1.05m, DateTime.UtcNow.AddDays(7), "Lácteos")
            };

            // Act
            var added = await invService.AddBatchFromScanAsync(houseId, userId, scannedProducts, "Mercadona");

            // Assert
            Assert.Equal(2, added.Count);

            var messages = await messageRepo.GetMessagesAsync(houseId, null);
            Assert.Single(messages);
            var systemMsg = messages.First();
            Assert.Equal("SYSTEM_ACTION", systemMsg.MessageType);
            Assert.Contains("José Pablo ha escaneado una compra y ha añadido 2 productos", systemMsg.Content);

            // SignalR broadcast checks
            Assert.Equal(2, notifier.BroadcastDeltas.Count);
            Assert.Single(notifier.BroadcastMessages);
            Assert.Equal("SCANNED_TICKET", notifier.BroadcastMessages[0].ActionMetadata?.ActionType);
            Assert.Equal("Mercadona", notifier.BroadcastMessages[0].ActionMetadata?.StoreName);
            Assert.Equal(2, notifier.BroadcastMessages[0].ActionMetadata?.TotalAdded);
        }

        [Fact]
        public async Task PostMessageAsync_SanitizesXss_AndBroadcastsLive()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();
            var userId = "aleja";

            var user = new User { Id = userId, Email = "aleja@uco.es", FullName = "Alejandro Gallardo", PasswordHash = "hash" };
            db.Users.Add(user);
            var house = new House { Id = houseId, Name = "Piso", InviteCode = "INV1" };
            db.Houses.Add(house);
            db.UserHouses.Add(new UserHouse { HouseId = houseId, UserId = userId, Role = "Admin" });
            await db.SaveChangesAsync();

            var messageRepo = new HouseMessageRepository(db);
            var houseRepo = new HouseRepository(db);
            var userRepo = new UserRepository(db);
            var notifier = new MockHouseCollaborationNotifier();

            var socialService = new HouseSocialService(messageRepo, houseRepo, userRepo, notifier);

            // Act - Send message with malicious script injection
            var maliciousPayload = "Hola equipo <script>alert('pwned')</script>";
            var posted = await socialService.PostMessageAsync(houseId, userId, new CreateHouseMessageDto(maliciousPayload));

            // Assert
            Assert.DoesNotContain("<script>", posted.Content);
            Assert.Contains("Hola equipo", posted.Content);

            Assert.Single(notifier.BroadcastMessages);
            Assert.Equal(posted.Content, notifier.BroadcastMessages[0].Content);
        }

        [Fact]
        public async Task PostMessageAsync_UnauthorizedUser_ThrowsException()
        {
            // Arrange
            using var db = CreateInMemoryDbContext();
            var houseId = Guid.NewGuid();
            var outsiderUserId = "attacker_99";

            var user = new User { Id = outsiderUserId, Email = "hacker@evil.com", FullName = "Hacker", PasswordHash = "hash" };
            db.Users.Add(user);
            var house = new House { Id = houseId, Name = "Piso Seguro", InviteCode = "SECURE1" };
            db.Houses.Add(house);
            // Outsider is NOT added to user_houses
            await db.SaveChangesAsync();

            var messageRepo = new HouseMessageRepository(db);
            var houseRepo = new HouseRepository(db);
            var userRepo = new UserRepository(db);
            var notifier = new MockHouseCollaborationNotifier();

            var socialService = new HouseSocialService(messageRepo, houseRepo, userRepo, notifier);

            // Act & Assert (RNF6 Isolation)
            await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
                socialService.PostMessageAsync(houseId, outsiderUserId, new CreateHouseMessageDto("Trying to breach")));
        }

        [Fact]
        public void MediaValidator_ValidatesAllowedFormatsAndRejectsInvalidFiles()
        {
            // Valid JPEG (FF D8 FF)
            using var validJpgStream = new MemoryStream(new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46 });
            var isValidJpg = MediaValidator.ValidateMedia(validJpgStream, "recipe_photo.jpg", "image/jpeg", out var err1);
            Assert.True(isValidJpg);
            Assert.Empty(err1);

            // Valid PNG (89 50 4E 47)
            using var validPngStream = new MemoryStream(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A });
            var isValidPng = MediaValidator.ValidateMedia(validPngStream, "shopping_receipt.png", "image/png", out var err2);
            Assert.True(isValidPng);
            Assert.Empty(err2);

            // Valid MP4 (...ftyp)
            using var validMp4Stream = new MemoryStream(new byte[] { 0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D });
            var isValidMp4 = MediaValidator.ValidateMedia(validMp4Stream, "cooking_step.mp4", "video/mp4", out var err3);
            Assert.True(isValidMp4);
            Assert.Empty(err3);

            // Disallowed Extension (.exe / executable disguised as image)
            using var exeStream = new MemoryStream(new byte[] { 0x4D, 0x5A, 0x90, 0x00 });
            var isInvalidExt = MediaValidator.ValidateMedia(exeStream, "virus.exe", "application/x-msdownload", out var err4);
            Assert.False(isInvalidExt);
            Assert.Contains("Extensión no permitida", err4);

            // Fake JPEG (named .jpg but with random/invalid header)
            using var fakeJpgStream = new MemoryStream(new byte[] { 0x01, 0x02, 0x03, 0x04 });
            var isFakeJpg = MediaValidator.ValidateMedia(fakeJpgStream, "fake.jpg", "image/jpeg", out var err5);
            Assert.False(isFakeJpg);
            Assert.Contains("Firma o cabecera (Magic Bytes)", err5);
        }
    }
}

