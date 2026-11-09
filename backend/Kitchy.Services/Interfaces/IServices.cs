using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;

namespace Kitchy.Services.Interfaces
{
    public interface IInventoryService
    {
        Task<List<InventoryItemDto>> GetInventoryAsync(Guid houseId);
        Task<UrgentItemsSummaryDto> GetUrgentSummaryAsync(Guid houseId);
        Task<InventoryItemDto> AddItemAsync(Guid houseId, string userId, CreateInventoryItemDto dto);
        Task<InventoryItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateInventoryItemDto dto);
        Task<bool> DeleteItemAsync(Guid houseId, Guid itemId);
        Task<bool> DiscardAndAddToShoppingListAsync(Guid houseId, string userId, string barcode);
    }

    public interface IShoppingListService
    {
        Task<List<ShoppingListItemDto>> GetShoppingListAsync(Guid houseId);
        Task<ShoppingListItemDto> AddItemAsync(Guid houseId, string userId, CreateShoppingItemDto dto);
        Task<ShoppingListItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateShoppingItemDto dto);
        Task<bool> DeleteItemAsync(Guid houseId, Guid itemId);
        Task<bool> ClearCheckedAsync(Guid houseId);
    }

    public interface IDeltaService
    {
        Task<RecipeDeltaCalculationDto> CalculateDeltaAsync(Guid houseId, Guid recipeId);
        Task<SendDeltaToShoppingListResponse> SendDeltaToShoppingListAsync(Guid houseId, string userId, SendDeltaToShoppingListRequest request);
    }

    public interface IRecipeService
    {
        Task<List<RecipeDto>> GetRecipesAsync(Guid houseId);
        Task<List<RecipeDto>> GetExpiringProductSuggestionsAsync(Guid houseId);
        Task<RecipeDto?> GetRecipeByIdAsync(Guid recipeId, Guid houseId);
        Task<RecipeDto> CreateRecipeAsync(Guid houseId, string userId, CreateRecipeDto dto);
    }

    public interface IOcrService
    {
        OcrTicketResultDto ParseReceiptText(string rawText);
        DateTime? ExtractExpirationDate(string rawText);
        Task<List<InventoryItemDto>> BatchConfirmOcrAsync(Guid houseId, string userId, List<DetectedProductDto> products);
    }

    public interface IOpenFoodFactsService
    {
        Task<BarcodeProductDto?> FetchProductByBarcodeAsync(string barcode);
    }

    public interface IAuthService
    {
        Task<AuthResponse> AuthenticateAsync(LoginRequest request);
        Task<AuthResponse> RegisterAsync(RegisterRequest request);
        string GenerateJwtToken(string userId, string email, string fullName, List<Guid> houseIds);
    }

    public interface IUserService
    {
        Task<UserProfileDto?> GetProfileAsync(string userId);
        Task<UserProfileDto?> UpdateProfileAsync(string userId, UpdateProfileDto dto);
        Task<bool> ChangePasswordAsync(string userId, ChangePasswordDto dto);
    }
}

