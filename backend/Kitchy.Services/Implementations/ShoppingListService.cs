using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Core.Security;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class ShoppingListService : IShoppingListService
    {
        private readonly IShoppingListRepository _shoppingListRepo;

        public ShoppingListService(IShoppingListRepository shoppingListRepo)
        {
            _shoppingListRepo = shoppingListRepo;
        }

        public async Task<List<ShoppingListItemDto>> GetShoppingListAsync(Guid houseId)
        {
            var items = await _shoppingListRepo.GetByHouseAsync(houseId);
            return items.Select(MapToDto).ToList();
        }

        public async Task<ShoppingListItemDto> AddItemAsync(Guid houseId, string userId, CreateShoppingItemDto dto)
        {
            var item = new ShoppingListItem
            {
                HouseId = houseId,
                MasterProductId = dto.MasterProductId,
                Name = InputSanitizer.Sanitize(dto.Name),
                Quantity = dto.Quantity,
                Unit = InputSanitizer.Sanitize(dto.Unit),
                Source = dto.Source,
                IsChecked = false,
                AddedByUserId = userId
            };

            var added = await _shoppingListRepo.AddAsync(item);
            return MapToDto(added);
        }

        public async Task<ShoppingListItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateShoppingItemDto dto)
        {
            var existing = await _shoppingListRepo.GetByIdAsync(itemId, houseId);
            if (existing == null) return null;

            if (dto.Name != null) existing.Name = dto.Name;
            if (dto.Quantity.HasValue) existing.Quantity = dto.Quantity.Value;
            if (dto.Unit != null) existing.Unit = dto.Unit;
            if (dto.IsChecked.HasValue) existing.IsChecked = dto.IsChecked.Value;
            if (dto.AssignedToUserId != null) existing.AssignedToUserId = dto.AssignedToUserId;

            var updated = await _shoppingListRepo.UpdateAsync(existing);
            return updated != null ? MapToDto(updated) : null;
        }

        public async Task<bool> DeleteItemAsync(Guid houseId, Guid itemId)
        {
            return await _shoppingListRepo.DeleteAsync(itemId, houseId);
        }

        public async Task<bool> ClearCheckedAsync(Guid houseId)
        {
            return await _shoppingListRepo.ClearCheckedAsync(houseId);
        }

        private static ShoppingListItemDto MapToDto(ShoppingListItem s)
        {
            return new ShoppingListItemDto(
                Id: s.Id,
                HouseId: s.HouseId,
                MasterProductId: s.MasterProductId,
                Name: s.Name,
                Quantity: s.Quantity,
                Unit: s.Unit,
                IsChecked: s.IsChecked,
                Source: s.Source,
                AddedByUserId: s.AddedByUserId,
                AssignedToUserId: s.AssignedToUserId,
                CreatedAt: s.CreatedAt,
                ImageUrl: s.MasterProduct?.ImageUrl
            );
        }
    }
}

