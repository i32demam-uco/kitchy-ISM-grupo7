using System;
using System.Collections.Generic;
using Kitchy.Core.Enums;

namespace Kitchy.Core.DTOs
{
    // Auth
    public record LoginRequest(string Email, string Password);
    public record RegisterRequest(string Email, string Password, string FullName);
    public record AuthResponse(string Token, string UserId, string Email, string FullName, Guid? DefaultHouseId);
    public record UserInfoDto(string UserId, string Email, string FullName, List<HouseSummaryDto> Houses);
    public record HouseSummaryDto(Guid Id, string Name, string Role, int MemberCount);
    public record UserProfileDto(string UserId, string Email, string FullName, string? AvatarUrl, DateTime CreatedAt, List<HouseSummaryDto> Houses);
    public record UpdateProfileDto(string? FullName, string? AvatarUrl);
    public record ChangePasswordDto(string CurrentPassword, string NewPassword);

    // House
    public record HouseDto(
        Guid Id,
        string Name,
        string? Address,
        double? Latitude,
        double? Longitude,
        string InviteCode,
        int MemberCount,
        string? JoinCode = null
    );

    public record CreateHouseDto(string Name, string? Address = null, double? Latitude = null, double? Longitude = null);
    public record JoinHouseDto(string? InviteCode, string? JoinCode = null)
    {
        public string EffectiveCode => (JoinCode ?? InviteCode ?? "").Trim().ToUpperInvariant();
    }

    // Inventory
    public record CreateInventoryItemDto(
        string Name,
        decimal Quantity,
        string Unit,
        DateTime ExpirationDate,
        string Location,
        decimal Price,
        string? Barcode,
        string? ImageUrl = null,
        Guid? HouseId = null
    );

    public record UpdateInventoryItemDto(
        string? Name,
        decimal? Quantity,
        string? Unit,
        DateTime? ExpirationDate,
        string? Location,
        decimal? Price
    );

    public record InventoryItemDto(
        Guid Id,
        Guid HouseId,
        Guid? MasterProductId,
        string Name,
        decimal Quantity,
        string Unit,
        DateTime ExpirationDate,
        string Location,
        decimal Price,
        DateTime PurchaseDate,
        string AddedByUserId,
        ItemUrgency UrgencyLevel,
        int RemainingDays,
        string? ImageUrl
    );

    public record UrgentItemsSummaryDto(
        int UrgentCount, // Items expiring in <= 48h
        List<InventoryItemDto> Items
    );

    // Shopping List
    public record CreateShoppingItemDto(
        string Name,
        decimal Quantity,
        string Unit,
        string Source, // Manual, Voice, OCR, RecipeDelta
        Guid? MasterProductId
    );

    public record UpdateShoppingItemDto(
        string? Name,
        decimal? Quantity,
        string? Unit,
        bool? IsChecked,
        string? AssignedToUserId
    );

    public record ShoppingListItemDto(
        Guid Id,
        Guid HouseId,
        Guid? MasterProductId,
        string Name,
        decimal Quantity,
        string Unit,
        bool IsChecked,
        string Source,
        string AddedByUserId,
        string? AssignedToUserId,
        DateTime CreatedAt,
        string? ImageUrl
    );

    // Delta Algorithm (Motor Delta)
    public record MissingIngredientDto(
        string Name,
        decimal RequiredQuantity,
        decimal AvailableQuantity,
        decimal DeficitQuantity,
        string Unit,
        bool IsMissing
    );

    public record RecipeDeltaCalculationDto(
        Guid RecipeId,
        string RecipeTitle,
        bool CanCookNow,
        int TotalIngredientsCount,
        int MissingIngredientsCount,
        List<MissingIngredientDto> Ingredients
    );

    public record SendDeltaToShoppingListRequest(
        Guid RecipeId,
        List<string>? IngredientNames // Optional: filter specific items, or all missing if empty
    );

    public record SendDeltaToShoppingListResponse(
        int ItemsAddedCount,
        List<ShoppingListItemDto> AddedItems
    );

    // Recipes
    public record RecipeStepDto(
        int Step,
        string Title,
        string Text,
        int TimeSeconds,
        string? Tip
    );

    public record RecipeIngredientDto(
        string Name,
        decimal Quantity,
        string Unit
    );

    public record RecipeDto(
        Guid Id,
        Guid? HouseId,
        string Title,
        string? Description,
        List<RecipeStepDto> Steps,
        List<RecipeIngredientDto> Ingredients,
        int Servings,
        int PrepTimeMinutes,
        string? ImageUrl,
        string Source,
        bool CanCookWithCurrentStock
    );

    public record CreateRecipeDto(
        string Title,
        string? Description,
        int Servings,
        int PrepTimeMinutes,
        string? ImageUrl,
        List<RecipeStepDto> Steps,
        List<RecipeIngredientDto> Ingredients
    );

    // OCR & Receipts
    public record ProcessTicketRequestDto(
        string? ImageBase64,
        string? RawOcrText
    );

    public record DetectedProductDto(
        string Name,
        decimal Quantity,
        string Unit,
        decimal UnitPrice,
        decimal TotalPrice,
        DateTime? EstimatedExpiration,
        string Category
    );

    public record OcrTicketResultDto(
        string StoreName,
        DateTime TicketDate,
        decimal TotalAmount,
        List<DetectedProductDto> DetectedProducts
    );

    public record BatchConfirmOcrRequest(
        List<DetectedProductDto> Products
    );

    // Barcode & Open Food Facts
    public record BarcodeProductDto(
        string Barcode,
        string Name,
        string Brand,
        string Category,
        string? ImageUrl,
        int SuggestedShelfLifeDays,
        string DefaultUnit,
        decimal? NetWeight
    );
}

