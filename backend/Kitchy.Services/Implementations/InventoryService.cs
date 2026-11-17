using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Enums;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Core.Security;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class InventoryService : IInventoryService
    {
        private readonly IInventoryRepository _inventoryRepo;
        private readonly IShoppingListRepository _shoppingListRepo;
        private readonly IMasterProductRepository _masterProductRepo;
        private readonly IHouseCollaborationNotifier? _notifier;
        private readonly IUserRepository? _userRepo;
        private readonly IHouseMessageRepository? _messageRepo;

        public InventoryService(
            IInventoryRepository inventoryRepo,
            IShoppingListRepository shoppingListRepo,
            IMasterProductRepository masterProductRepo,
            IHouseCollaborationNotifier? notifier = null,
            IUserRepository? userRepo = null,
            IHouseMessageRepository? messageRepo = null)
        {
            _inventoryRepo = inventoryRepo;
            _shoppingListRepo = shoppingListRepo;
            _masterProductRepo = masterProductRepo;
            _notifier = notifier;
            _userRepo = userRepo;
            _messageRepo = messageRepo;
        }

        public async Task<List<InventoryItemDto>> GetInventoryAsync(Guid houseId)
        {
            var items = await _inventoryRepo.GetByHouseAsync(houseId);
            return items.Select(MapToDto).ToList();
        }

        public async Task<UrgentItemsSummaryDto> GetUrgentSummaryAsync(Guid houseId)
        {
            var urgentItems = await _inventoryRepo.GetUrgentByHouseAsync(houseId, hoursThreshold: 48);
            var dtos = urgentItems.Select(MapToDto).ToList();
            return new UrgentItemsSummaryDto(dtos.Count, dtos);
        }

        public async Task<InventoryItemDto> AddItemAsync(Guid houseId, string userId, CreateInventoryItemDto dto)
        {
            Guid? masterProductId = null;
            if (!string.IsNullOrEmpty(dto.Barcode))
            {
                var master = await _masterProductRepo.GetByBarcodeAsync(dto.Barcode);
                masterProductId = master?.Id;
            }

            var item = new InventoryItem
            {
                HouseId = houseId,
                MasterProductId = masterProductId,
                Name = InputSanitizer.Sanitize(dto.Name),
                Quantity = dto.Quantity,
                Unit = InputSanitizer.Sanitize(dto.Unit),
                ExpirationDate = dto.ExpirationDate,
                Location = InputSanitizer.Sanitize(dto.Location),
                Price = dto.Price,
                ImageUrl = dto.ImageUrl,
                AddedByUserId = userId,
                PurchaseDate = DateTime.UtcNow
            };

            var added = await _inventoryRepo.AddAsync(item);
            var itemDto = MapToDto(added);

            if (_notifier != null)
            {
                await _notifier.BroadcastInventoryDeltaAsync(houseId, new InventoryDeltaDto(
                    Action: "ADDED",
                    ItemId: added.Id,
                    ItemName: added.Name,
                    NewQuantity: added.Quantity,
                    QuantityDelta: added.Quantity,
                    Unit: added.Unit,
                    PerformedByUserId: userId,
                    ImageUrl: added.ImageUrl
                ));
            }

            return itemDto;
        }

        public async Task<InventoryItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateInventoryItemDto dto)
        {
            var existing = await _inventoryRepo.GetByIdAsync(itemId, houseId);
            if (existing == null) return null;

            var oldQuantity = existing.Quantity;

            if (dto.Name != null) existing.Name = dto.Name;
            if (dto.Quantity.HasValue) existing.Quantity = dto.Quantity.Value;
            if (dto.Unit != null) existing.Unit = dto.Unit;
            if (dto.ExpirationDate.HasValue) existing.ExpirationDate = dto.ExpirationDate.Value;
            if (dto.Location != null) existing.Location = dto.Location;
            if (dto.Price.HasValue) existing.Price = dto.Price.Value;

            var updated = await _inventoryRepo.UpdateAsync(existing);
            if (updated == null) return null;

            // If quantity decreased, notify consumption
            if (dto.Quantity.HasValue && dto.Quantity.Value < oldQuantity)
            {
                var delta = oldQuantity - dto.Quantity.Value;
                if (_notifier != null)
                {
                    await _notifier.BroadcastInventoryDeltaAsync(houseId, new InventoryDeltaDto(
                        Action: "CONSUMED",
                        ItemId: updated.Id,
                        ItemName: updated.Name,
                        NewQuantity: updated.Quantity,
                        QuantityDelta: -delta,
                        Unit: updated.Unit,
                        PerformedByUserId: updated.AddedByUserId,
                        ImageUrl: updated.ImageUrl
                    ));
                }
            }

            return MapToDto(updated);
        }

        public async Task<InventoryItemDto?> ConsumeItemAsync(Guid houseId, string userId, Guid itemId, decimal quantityConsumed)
        {
            var existing = await _inventoryRepo.GetByIdAsync(itemId, houseId);
            if (existing == null) return null;

            var oldQuantity = existing.Quantity;
            var newQuantity = Math.Max(0, oldQuantity - quantityConsumed);
            var actualConsumed = oldQuantity - newQuantity;

            existing.Quantity = newQuantity;
            if (newQuantity <= 0)
            {
                await _inventoryRepo.DeleteAsync(itemId, houseId);
            }
            else
            {
                await _inventoryRepo.UpdateAsync(existing);
            }

            var user = _userRepo != null ? await _userRepo.GetByIdAsync(userId) : null;
            var userName = user?.FullName ?? (userId == "aleja" ? "Alejandro" : userId);

            // Persist SYSTEM_ACTION in house_messages
            var content = $"{userName} ha gastado {actualConsumed} {existing.Unit} de {existing.Name}";
            var actionMetadata = new HouseMessageActionMetadataDto(
                ActionType: "CONSUMED",
                PerformedBy: userId,
                PerformedByName: userName,
                StockRemaining: newQuantity,
                AffectedProducts: new List<ActionProductItemDto>
                {
                    new ActionProductItemDto(existing.Name, actualConsumed, existing.Unit, existing.ImageUrl ?? existing.MasterProduct?.ImageUrl)
                }
            );

            if (_messageRepo != null)
            {
                await _messageRepo.AddMessageAsync(new HouseMessage
                {
                    HouseId = houseId,
                    SenderId = userId,
                    MessageType = "SYSTEM_ACTION",
                    Content = content,
                    ActionMetadataJson = System.Text.Json.JsonSerializer.Serialize(actionMetadata),
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (_notifier != null)
            {
                // Emit SyncInventoryState
                await _notifier.BroadcastInventoryDeltaAsync(houseId, new InventoryDeltaDto(
                    Action: "CONSUMED",
                    ItemId: itemId,
                    ItemName: existing.Name,
                    NewQuantity: newQuantity,
                    QuantityDelta: -actualConsumed,
                    Unit: existing.Unit,
                    PerformedByUserId: userId,
                    ImageUrl: existing.ImageUrl ?? existing.MasterProduct?.ImageUrl
                ));

                // Emit ReceiveChatMessage
                await _notifier.BroadcastChatMessageAsync(houseId, new HouseMessageDto(
                    Id: Guid.NewGuid(),
                    HouseId: houseId,
                    SenderId: userId,
                    SenderName: userName,
                    SenderAvatar: user?.AvatarUrl,
                    MessageType: "SYSTEM_ACTION",
                    Content: content,
                    MediaUrl: null,
                    MediaThumbnailUrl: null,
                    ActionMetadata: actionMetadata,
                    CreatedAt: DateTime.UtcNow
                ));
            }

            return MapToDto(existing);
        }

        public async Task<List<InventoryItemDto>> AddBatchFromScanAsync(Guid houseId, string userId, List<DetectedProductDto> products, string storeName)
        {
            var addedDtos = new List<InventoryItemDto>();
            var affected = new List<ActionProductItemDto>();

            foreach (var p in products)
            {
                var expiration = p.EstimatedExpiration ?? DateTime.UtcNow.AddDays(7);
                var item = new InventoryItem
                {
                    HouseId = houseId,
                    Name = InputSanitizer.Sanitize(p.Name),
                    Quantity = p.Quantity > 0 ? p.Quantity : 1,
                    Unit = InputSanitizer.Sanitize(p.Unit ?? "ud"),
                    ExpirationDate = expiration,
                    Location = "Nevera",
                    Price = p.TotalPrice > 0 ? p.TotalPrice : p.UnitPrice,
                    AddedByUserId = userId,
                    PurchaseDate = DateTime.UtcNow
                };

                var added = await _inventoryRepo.AddAsync(item);
                var dto = MapToDto(added);
                addedDtos.Add(dto);
                affected.Add(new ActionProductItemDto(added.Name, added.Quantity, added.Unit, added.ImageUrl));

                if (_notifier != null)
                {
                    await _notifier.BroadcastInventoryDeltaAsync(houseId, new InventoryDeltaDto(
                        Action: "ADDED",
                        ItemId: added.Id,
                        ItemName: added.Name,
                        NewQuantity: added.Quantity,
                        QuantityDelta: added.Quantity,
                        Unit: added.Unit,
                        PerformedByUserId: userId,
                        ImageUrl: added.ImageUrl
                    ));
                }
            }

            var user = _userRepo != null ? await _userRepo.GetByIdAsync(userId) : null;
            var userName = user?.FullName ?? (userId == "aleja" ? "Alejandro" : userId);
            var content = $"{userName} ha escaneado una compra y ha añadido {products.Count} productos a la despensa";

            var actionMetadata = new HouseMessageActionMetadataDto(
                ActionType: "SCANNED_TICKET",
                PerformedBy: userId,
                PerformedByName: userName,
                TotalAdded: products.Count,
                StoreName: storeName,
                AffectedProducts: affected
            );

            if (_messageRepo != null)
            {
                await _messageRepo.AddMessageAsync(new HouseMessage
                {
                    HouseId = houseId,
                    SenderId = userId,
                    MessageType = "SYSTEM_ACTION",
                    Content = content,
                    ActionMetadataJson = System.Text.Json.JsonSerializer.Serialize(actionMetadata),
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (_notifier != null)
            {
                await _notifier.BroadcastChatMessageAsync(houseId, new HouseMessageDto(
                    Id: Guid.NewGuid(),
                    HouseId: houseId,
                    SenderId: userId,
                    SenderName: userName,
                    SenderAvatar: user?.AvatarUrl,
                    MessageType: "SYSTEM_ACTION",
                    Content: content,
                    MediaUrl: null,
                    MediaThumbnailUrl: null,
                    ActionMetadata: actionMetadata,
                    CreatedAt: DateTime.UtcNow
                ));
            }

            return addedDtos;
        }

        public async Task<bool> DeleteItemAsync(Guid houseId, Guid itemId)
        {
            var item = await _inventoryRepo.GetByIdAsync(itemId, houseId);
            var deleted = await _inventoryRepo.DeleteAsync(itemId, houseId);
            if (deleted && item != null && _notifier != null)
            {
                await _notifier.BroadcastInventoryDeltaAsync(houseId, new InventoryDeltaDto(
                    Action: "DELETED",
                    ItemId: itemId,
                    ItemName: item.Name,
                    NewQuantity: 0,
                    QuantityDelta: -item.Quantity,
                    Unit: item.Unit,
                    PerformedByUserId: item.AddedByUserId,
                    ImageUrl: item.ImageUrl
                ));
            }
            return deleted;
        }

        public async Task<bool> DiscardAndAddToShoppingListAsync(Guid houseId, string userId, string barcode)
        {
            var masterProduct = await _masterProductRepo.GetByBarcodeAsync(barcode);
            var inventoryItems = await _inventoryRepo.GetByHouseAsync(houseId);

            InventoryItem? itemToDiscard = null;
            if (masterProduct != null)
            {
                itemToDiscard = inventoryItems.FirstOrDefault(i => i.MasterProductId == masterProduct.Id);
            }
            if (itemToDiscard == null)
            {
                itemToDiscard = inventoryItems.FirstOrDefault(i => i.Name.Contains(barcode, StringComparison.OrdinalIgnoreCase));
            }

            if (itemToDiscard != null)
            {
                // Decrement or delete
                if (itemToDiscard.Quantity > 1)
                {
                    itemToDiscard.Quantity -= 1;
                    await _inventoryRepo.UpdateAsync(itemToDiscard);
                }
                else
                {
                    await _inventoryRepo.DeleteAsync(itemToDiscard.Id, houseId);
                }

                // Add to shopping list (RF7)
                await _shoppingListRepo.AddAsync(new ShoppingListItem
                {
                    HouseId = houseId,
                    MasterProductId = itemToDiscard.MasterProductId,
                    Name = itemToDiscard.Name,
                    Quantity = 1,
                    Unit = itemToDiscard.Unit,
                    IsChecked = false,
                    Source = ItemSource.Barcode.ToString(),
                    AddedByUserId = userId
                });

                if (_notifier != null)
                {
                    await _notifier.BroadcastInventoryDeltaAsync(houseId, new InventoryDeltaDto(
                        Action: "DISCARDED",
                        ItemId: itemToDiscard.Id,
                        ItemName: itemToDiscard.Name,
                        NewQuantity: itemToDiscard.Quantity,
                        QuantityDelta: -1,
                        Unit: itemToDiscard.Unit,
                        PerformedByUserId: userId,
                        ImageUrl: itemToDiscard.ImageUrl
                    ));
                }

                return true;
            }

            return false;
        }

        private static InventoryItemDto MapToDto(InventoryItem i)
        {
            return new InventoryItemDto(
                Id: i.Id,
                HouseId: i.HouseId,
                MasterProductId: i.MasterProductId,
                Name: i.Name,
                Quantity: i.Quantity,
                Unit: i.Unit,
                ExpirationDate: i.ExpirationDate,
                Location: i.Location,
                Price: i.Price,
                PurchaseDate: i.PurchaseDate,
                AddedByUserId: i.AddedByUserId,
                UrgencyLevel: i.UrgencyLevel,
                RemainingDays: i.RemainingDays,
                ImageUrl: i.ImageUrl ?? i.MasterProduct?.ImageUrl
            );
        }
    }
}
