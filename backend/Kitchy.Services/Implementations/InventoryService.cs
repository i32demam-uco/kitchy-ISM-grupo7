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

        public InventoryService(
            IInventoryRepository inventoryRepo,
            IShoppingListRepository shoppingListRepo,
            IMasterProductRepository masterProductRepo)
        {
            _inventoryRepo = inventoryRepo;
            _shoppingListRepo = shoppingListRepo;
            _masterProductRepo = masterProductRepo;
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
            return MapToDto(added);
        }

        public async Task<InventoryItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateInventoryItemDto dto)
        {
            var existing = await _inventoryRepo.GetByIdAsync(itemId, houseId);
            if (existing == null) return null;

            if (dto.Name != null) existing.Name = dto.Name;
            if (dto.Quantity.HasValue) existing.Quantity = dto.Quantity.Value;
            if (dto.Unit != null) existing.Unit = dto.Unit;
            if (dto.ExpirationDate.HasValue) existing.ExpirationDate = dto.ExpirationDate.Value;
            if (dto.Location != null) existing.Location = dto.Location;
            if (dto.Price.HasValue) existing.Price = dto.Price.Value;

            var updated = await _inventoryRepo.UpdateAsync(existing);
            return updated != null ? MapToDto(updated) : null;
        }

        public async Task<bool> DeleteItemAsync(Guid houseId, Guid itemId)
        {
            return await _inventoryRepo.DeleteAsync(itemId, houseId);
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

