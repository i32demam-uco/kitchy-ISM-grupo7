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
        string? Name = null,
        decimal? Quantity = null,
        string? Unit = null,
        DateTime? ExpirationDate = null,
        string? Location = null,
        decimal? Price = null,
        Guid? HouseId = null,
        Guid? ItemId = null
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

    public record ShoppingListUrgencyStatusDto(
        bool IsUrgent,
        string UrgentModeSource, // NONE, MANUAL, AUTO_LOW_STOCK
        DateTime? UrgentUpdatedAt,
        int PendingCount
    );

    public record UpdateUrgencyRequestDto(
        bool IsUrgent
    );

    public record ReconcileShoppingListRequestDto(
        List<DetectedProductDto> DetectedProducts
    );

    public record ReconciliationResultDto(
        int ReconciledCount,
        List<string> ReconciledItemNames,
        bool IsUrgent,
        int RemainingCount
    );

    // Delta Algorithm (Motor Delta - Disponible, Prioritario, Faltante)
    public record MissingIngredientDto(
        string Name,
        decimal RequiredQuantity,
        decimal AvailableQuantity,
        decimal DeficitQuantity,
        string Unit,
        bool IsMissing,
        string Status = "Disponible", // "Disponible", "Prioritario", "Faltante"
        bool IsExpiringSoon = false
    );

    public record RecipeDeltaCalculationDto(
        Guid RecipeId,
        string RecipeTitle,
        bool CanCookNow,
        int TotalIngredientsCount,
        int MissingIngredientsCount,
        List<MissingIngredientDto> Ingredients,
        int PantryMatchPercentage = 100,
        int UrgentIngredientsCount = 0
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
        string Unit,
        string? Status = "Disponible", // Disponible, Prioritario, Faltante
        decimal? AvailableQuantity = 0,
        decimal? DeficitQuantity = 0,
        bool IsExpiringSoon = false
    );

    public record RecipeDto(
        Guid Id,
        Guid? HouseId,
        string Title,
        string? Subtitle,
        string? Description,
        List<RecipeStepDto> Steps,
        List<RecipeIngredientDto> Ingredients,
        int Servings,
        int TotalTimeMinutes,
        string Difficulty,
        int CaloriesKcal,
        int PantryMatchPercentage,
        string SourceType,
        string? ImageUrl,
        string Source,
        bool CanCookWithCurrentStock,
        bool IsFavorite = false,
        string? CreatedBy = null,
        int PrepTimeMinutes = 20
    );

    public record CreateRecipeDto(
        string Title,
        string? Subtitle,
        string? Description,
        int Servings,
        int TotalTimeMinutes,
        string? Difficulty,
        int? CaloriesKcal,
        string? ImageUrl,
        List<RecipeStepDto> Steps,
        List<RecipeIngredientDto> Ingredients,
        int? PrepTimeMinutes = null
    );

    public record UpdateRecipeDto(
        string? Title,
        string? Subtitle,
        string? Description,
        int? Servings,
        int? TotalTimeMinutes,
        string? Difficulty,
        int? CaloriesKcal,
        string? ImageUrl,
        List<RecipeStepDto>? Steps,
        List<RecipeIngredientDto>? Ingredients
    );

    public record CompleteCookingRequestDto(
        int ServingsMultiplier = 1
    );

    public record CompleteCookingResultDto(
        Guid RecipeId,
        string RecipeTitle,
        int ItemsDeductedCount,
        List<string> DeductedItemsSummary,
        string ChatNotificationMessage
    );

    public record GenerateRecipeOptionsRequestDto(
        Guid HouseId,
        bool ForceUrgentPriority = true,
        int MaxOptions = 4,
        List<string>? ForcedIngredients = null,
        string? CravingPrompt = null
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

    // Social & Collaboration (House Chat, Realtime & System Actions)
    public record ActionProductItemDto(
        string ProductName,
        decimal Quantity,
        string Unit,
        string? ImageUrl = null
    );

    public record HouseMessageActionMetadataDto(
        string ActionType, // CONSUMED, SCANNED_TICKET, ADDED_MANUAL, COOKED_RECIPE
        string PerformedBy,
        string PerformedByName,
        List<ActionProductItemDto> AffectedProducts,
        decimal? StockRemaining = null,
        int? TotalAdded = null,
        string? StoreName = null
    );

    public record HouseMessageDto(
        Guid Id,
        Guid HouseId,
        string SenderId,
        string SenderName,
        string? SenderAvatar,
        string MessageType, // TEXT, IMAGE, VIDEO, SYSTEM_ACTION
        string Content,
        string? MediaUrl,
        string? MediaThumbnailUrl,
        HouseMessageActionMetadataDto? ActionMetadata,
        DateTime CreatedAt
    );

    public record CreateHouseMessageDto(
        string? Content,
        string MessageType = "TEXT",
        string? MediaUrl = null,
        string? MediaThumbnailUrl = null,
        HouseMessageActionMetadataDto? ActionMetadata = null
    );

    public record HouseMemberDto(
        string UserId,
        string FullName,
        string? AvatarUrl,
        string Role,
        bool IsOnline,
        DateTime JoinedAt
    );

    public record HouseMemberPresenceDto(
        string UserId,
        string FullName,
        string? AvatarUrl,
        string Role,
        bool IsOnline,
        DateTime? LastSeenAt
    );

    public record InventoryDeltaDto(
        string Action, // CONSUMED, ADDED, DELETED, UPDATED
        Guid ItemId,
        string ItemName,
        decimal NewQuantity,
        decimal QuantityDelta,
        string Unit,
        string PerformedByUserId,
        string? ImageUrl = null
    );

    public record ConsumeProductRequestDto(
        decimal Quantity
    );

    // Image Matching & Semantic Cascade
    public record ImageMatchResultDto(
        string ImageUrl,
        string Source,
        string MatchedTerm,
        string? TranslatedSubtype = null,
        double Confidence = 0.9
    );
}


