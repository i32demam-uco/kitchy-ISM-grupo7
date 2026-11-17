using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Kitchy.Core.Models;

namespace Kitchy.Core.Interfaces
{
    public interface IInventoryRepository
    {
        Task<List<InventoryItem>> GetByHouseAsync(Guid houseId);
        Task<List<InventoryItem>> GetUrgentByHouseAsync(Guid houseId, int hoursThreshold = 48);
        Task<InventoryItem?> GetByIdAsync(Guid id, Guid houseId);
        Task<InventoryItem> AddAsync(InventoryItem item);
        Task<InventoryItem?> UpdateAsync(InventoryItem item);
        Task<bool> DeleteAsync(Guid id, Guid houseId);
        Task<InventoryItem?> FindByNameAsync(Guid houseId, string name);
    }

    public interface IShoppingListRepository
    {
        Task<List<ShoppingListItem>> GetByHouseAsync(Guid houseId);
        Task<ShoppingListItem?> GetByIdAsync(Guid id, Guid houseId);
        Task<ShoppingListItem> AddAsync(ShoppingListItem item);
        Task<List<ShoppingListItem>> AddRangeAsync(IEnumerable<ShoppingListItem> items);
        Task<ShoppingListItem?> UpdateAsync(ShoppingListItem item);
        Task<bool> DeleteAsync(Guid id, Guid houseId);
        Task<bool> ClearCheckedAsync(Guid houseId);
    }

    public interface IRecipeRepository
    {
        Task<List<Recipe>> GetAvailableRecipesAsync(Guid? houseId);
        Task<Recipe?> GetByIdAsync(Guid id);
        Task<Recipe> AddAsync(Recipe recipe);
        Task<Recipe?> UpdateAsync(Recipe recipe);
        Task<bool> DeleteAsync(Guid id);
        Task<bool> ToggleFavoriteAsync(Guid recipeId, string userId);
        Task<HashSet<Guid>> GetUserFavoriteRecipeIdsAsync(string userId);
    }

    public interface IHouseRepository
    {
        Task<House?> GetByIdAsync(Guid id);
        Task<House?> GetByInviteCodeAsync(string inviteCode);
        Task<List<House>> GetHousesForUserAsync(string userId);
        Task<House> CreateHouseAsync(House house, string ownerUserId);
        Task<bool> AddUserToHouseAsync(string userId, Guid houseId, string role);
        Task<bool> IsUserInHouseAsync(string userId, Guid houseId);
        Task<House?> UpdateHouseAsync(House house);
    }

    public interface IMasterProductRepository
    {
        Task<MasterProduct?> GetByBarcodeAsync(string barcode);
        Task<MasterProduct?> FindByNameAsync(string name);
        Task<MasterProduct> AddAsync(MasterProduct product);
    }

    public interface IPriceHistoryRepository
    {
        Task AddPriceRecordAsync(Guid houseId, Guid masterProductId, string productName, decimal price);
        Task<List<PriceHistoryItem>> GetPriceHistoryAsync(Guid houseId, Guid masterProductId);
    }

    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(string id);
        Task<User?> GetByEmailAsync(string email);
        Task<User> CreateAsync(User user);
        Task<User> UpdateAsync(User user);
        Task<bool> ExistsByEmailAsync(string email);
    }

    public interface IHouseMessageRepository
    {
        Task<List<HouseMessage>> GetMessagesAsync(Guid houseId, DateTime? cursor, int limit = 30);
        Task<HouseMessage> AddMessageAsync(HouseMessage message);
        Task<List<UserHouse>> GetHouseMembersAsync(Guid houseId);
    }

    public interface IHouseCollaborationNotifier
    {
        Task BroadcastChatMessageAsync(Guid houseId, DTOs.HouseMessageDto message);
        Task BroadcastInventoryDeltaAsync(Guid houseId, DTOs.InventoryDeltaDto delta);
        Task BroadcastMemberPresenceAsync(Guid houseId, List<DTOs.HouseMemberPresenceDto> members);
        Task BroadcastShoppingListUrgencyChangedAsync(Guid houseId, DTOs.ShoppingListUrgencyStatusDto status);
        Task BroadcastShoppingListReconciledAsync(Guid houseId, DTOs.ReconciliationResultDto result);
    }
}


