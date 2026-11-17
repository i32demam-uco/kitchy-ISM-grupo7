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
        Task<InventoryItemDto?> ConsumeItemAsync(Guid houseId, string userId, Guid itemId, decimal quantityConsumed);
        Task<List<InventoryItemDto>> AddBatchFromScanAsync(Guid houseId, string userId, List<DetectedProductDto> products, string storeName);
    }


    public interface IShoppingListService
    {
        Task<List<ShoppingListItemDto>> GetShoppingListAsync(Guid houseId);
        Task<ShoppingListItemDto> AddItemAsync(Guid houseId, string userId, CreateShoppingItemDto dto);
        Task<ShoppingListItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateShoppingItemDto dto);
        Task<bool> DeleteItemAsync(Guid houseId, Guid itemId);
        Task<bool> ClearCheckedAsync(Guid houseId);
        Task<ShoppingListUrgencyStatusDto> GetUrgencyStatusAsync(Guid houseId);
        Task<ShoppingListUrgencyStatusDto> SetUrgencyStatusAsync(Guid houseId, bool isUrgent, string source = "MANUAL");
        Task<ShoppingListUrgencyStatusDto> EvaluateAutomaticUrgencyAsync(Guid houseId);
        Task<ReconciliationResultDto> ReconcileWithScannedProductsAsync(Guid houseId, string userId, List<DetectedProductDto> scannedProducts);
    }

    public interface IDeltaService
    {
        Task<RecipeDeltaCalculationDto> CalculateDeltaAsync(Guid houseId, Guid recipeId);
        Task<SendDeltaToShoppingListResponse> SendDeltaToShoppingListAsync(Guid houseId, string userId, SendDeltaToShoppingListRequest request);
    }

    public interface IRecipeService
    {
        Task<List<RecipeDto>> GetRecipesAsync(Guid houseId, string? userId = null);
        Task<List<RecipeDto>> GetExpiringProductSuggestionsAsync(Guid houseId);
        Task<RecipeDto?> GetRecipeByIdAsync(Guid recipeId, Guid houseId, string? userId = null);
        Task<RecipeDto> CreateRecipeAsync(Guid houseId, string userId, CreateRecipeDto dto);
        Task<RecipeDto?> UpdateRecipeAsync(Guid recipeId, Guid houseId, string userId, UpdateRecipeDto dto);
        Task<bool> ToggleFavoriteAsync(Guid recipeId, string userId);
        Task<CompleteCookingResultDto> CompleteCookingAsync(Guid recipeId, Guid houseId, string userId, CompleteCookingRequestDto dto);
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

    public interface IImageMatchingService
    {
        Task<ImageMatchResultDto> MatchImageAsync(string productName, string? category = null, string? barcode = null);
        ImageMatchResultDto MatchImage(string productName, string? category = null);
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

    public interface IHouseSocialService
    {
        Task<List<HouseMemberDto>> GetMembersAsync(Guid houseId, string currentUserId);
        Task<List<HouseMessageDto>> GetMessagesAsync(Guid houseId, string currentUserId, DateTime? cursor, int limit = 30);
        Task<HouseMessageDto> PostMessageAsync(Guid houseId, string currentUserId, CreateHouseMessageDto dto);
        Task<HouseMessageDto> CreateSystemActionAsync(Guid houseId, string userId, string actionType, string content, HouseMessageActionMetadataDto actionMetadata);
    }
}


