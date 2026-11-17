using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Enums;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class RecipeService : IRecipeService
    {
        private readonly IRecipeRepository _recipeRepo;
        private readonly IInventoryRepository _inventoryRepo;
        private readonly IUserRepository? _userRepo;
        private readonly IHouseSocialService? _socialService;

        public RecipeService(
            IRecipeRepository recipeRepo,
            IInventoryRepository inventoryRepo,
            IUserRepository? userRepo = null,
            IHouseSocialService? socialService = null)
        {
            _recipeRepo = recipeRepo;
            _inventoryRepo = inventoryRepo;
            _userRepo = userRepo;
            _socialService = socialService;
        }

        public async Task<List<RecipeDto>> GetRecipesAsync(Guid houseId, string? userId = null)
        {
            var recipes = await _recipeRepo.GetAvailableRecipesAsync(houseId);
            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            var favoriteIds = !string.IsNullOrEmpty(userId)
                ? await _recipeRepo.GetUserFavoriteRecipeIdsAsync(userId)
                : new HashSet<Guid>();

            return recipes.Select(r => MapToDto(r, inventory, favoriteIds)).ToList();
        }

        public async Task<List<RecipeDto>> GetExpiringProductSuggestionsAsync(Guid houseId)
        {
            var urgentItems = await _inventoryRepo.GetUrgentByHouseAsync(houseId, hoursThreshold: 48);
            var urgentNames = urgentItems.Select(u => u.Name.Trim().ToLowerInvariant()).ToList();

            var allRecipes = await _recipeRepo.GetAvailableRecipesAsync(houseId);
            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            var favoriteIds = new HashSet<Guid>();

            if (!urgentNames.Any())
            {
                return allRecipes.Take(5).Select(r => MapToDto(r, inventory, favoriteIds)).ToList();
            }

            var scored = allRecipes
                .Select(r =>
                {
                    int matchCount = r.Ingredients.Count(ing =>
                        urgentNames.Any(u => ing.Name.ToLowerInvariant().Contains(u) || u.Contains(ing.Name.ToLowerInvariant())));
                    return new { Recipe = r, Score = matchCount };
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .Select(x => MapToDto(x.Recipe, inventory, favoriteIds))
                .ToList();

            return scored.Any() ? scored : allRecipes.Take(3).Select(r => MapToDto(r, inventory, favoriteIds)).ToList();
        }

        public async Task<RecipeDto?> GetRecipeByIdAsync(Guid recipeId, Guid houseId, string? userId = null)
        {
            var recipe = await _recipeRepo.GetByIdAsync(recipeId);
            if (recipe == null) return null;

            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            var favoriteIds = !string.IsNullOrEmpty(userId)
                ? await _recipeRepo.GetUserFavoriteRecipeIdsAsync(userId)
                : new HashSet<Guid>();

            return MapToDto(recipe, inventory, favoriteIds);
        }

        public async Task<RecipeDto> CreateRecipeAsync(Guid houseId, string userId, CreateRecipeDto dto)
        {
            var stepsJson = JsonSerializer.Serialize(dto.Steps);
            var ingredientsJson = JsonSerializer.Serialize(dto.Ingredients);

            var recipe = new Recipe
            {
                HouseId = houseId,
                Title = dto.Title,
                Subtitle = dto.Subtitle ?? $"{dto.Servings} personas · Receta personalizada",
                Description = dto.Description,
                Servings = dto.Servings,
                TotalTimeMinutes = dto.TotalTimeMinutes > 0 ? dto.TotalTimeMinutes : (dto.PrepTimeMinutes ?? 20),
                PrepTimeMinutes = dto.PrepTimeMinutes ?? dto.TotalTimeMinutes,
                Difficulty = dto.Difficulty ?? "Media",
                CaloriesKcal = dto.CaloriesKcal ?? 450,
                SourceType = "USER_CREATED",
                ImageUrl = dto.ImageUrl,
                Source = "UserCustom",
                CreatedBy = userId,
                CreatedByUserId = userId,
                InstructionsJson = stepsJson,
                StepsJson = stepsJson,
                IngredientsJson = ingredientsJson,
                Ingredients = dto.Ingredients.Select(i => new RecipeIngredient
                {
                    Name = i.Name,
                    Quantity = i.Quantity,
                    Unit = i.Unit
                }).ToList()
            };

            var created = await _recipeRepo.AddAsync(recipe);
            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            return MapToDto(created, inventory, new HashSet<Guid>());
        }

        public async Task<RecipeDto?> UpdateRecipeAsync(Guid recipeId, Guid houseId, string userId, UpdateRecipeDto dto)
        {
            var existing = await _recipeRepo.GetByIdAsync(recipeId);
            if (existing == null) return null;

            if (dto.Title != null) existing.Title = dto.Title;
            if (dto.Subtitle != null) existing.Subtitle = dto.Subtitle;
            if (dto.Description != null) existing.Description = dto.Description;
            if (dto.Servings.HasValue) existing.Servings = dto.Servings.Value;
            if (dto.TotalTimeMinutes.HasValue)
            {
                existing.TotalTimeMinutes = dto.TotalTimeMinutes.Value;
                existing.PrepTimeMinutes = dto.TotalTimeMinutes.Value;
            }
            if (dto.Difficulty != null) existing.Difficulty = dto.Difficulty;
            if (dto.CaloriesKcal.HasValue) existing.CaloriesKcal = dto.CaloriesKcal.Value;
            if (dto.ImageUrl != null) existing.ImageUrl = dto.ImageUrl;

            if (dto.Steps != null && dto.Steps.Any())
            {
                var stepsJson = JsonSerializer.Serialize(dto.Steps);
                existing.StepsJson = stepsJson;
                existing.InstructionsJson = stepsJson;
            }

            if (dto.Ingredients != null && dto.Ingredients.Any())
            {
                existing.IngredientsJson = JsonSerializer.Serialize(dto.Ingredients);
                existing.Ingredients = dto.Ingredients.Select(i => new RecipeIngredient
                {
                    RecipeId = recipeId,
                    Name = i.Name,
                    Quantity = i.Quantity,
                    Unit = i.Unit
                }).ToList();
            }

            var updated = await _recipeRepo.UpdateAsync(existing);
            if (updated == null) return null;

            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            var favoriteIds = await _recipeRepo.GetUserFavoriteRecipeIdsAsync(userId);
            return MapToDto(updated, inventory, favoriteIds);
        }

        public async Task<bool> ToggleFavoriteAsync(Guid recipeId, string userId)
        {
            return await _recipeRepo.ToggleFavoriteAsync(recipeId, userId);
        }

        public async Task<CompleteCookingResultDto> CompleteCookingAsync(
            Guid recipeId,
            Guid houseId,
            string userId,
            CompleteCookingRequestDto dto)
        {
            var recipe = await _recipeRepo.GetByIdAsync(recipeId);
            if (recipe == null)
            {
                throw new KeyNotFoundException($"Receta con ID {recipeId} no encontrada.");
            }

            var inventoryItems = await _inventoryRepo.GetByHouseAsync(houseId);
            var deductedSummary = new List<string>();
            int multiplier = Math.Max(1, dto.ServingsMultiplier);

            foreach (var req in recipe.Ingredients)
            {
                var neededQty = req.Quantity * multiplier;
                var match = inventoryItems.FirstOrDefault(i =>
                    i.Name.Trim().Equals(req.Name.Trim(), StringComparison.OrdinalIgnoreCase) ||
                    i.Name.ToLowerInvariant().Contains(req.Name.ToLowerInvariant()) ||
                    req.Name.ToLowerInvariant().Contains(i.Name.ToLowerInvariant()));

                if (match != null)
                {
                    var newQty = Math.Max(0, match.Quantity - neededQty);
                    match.Quantity = newQty;
                    deductedSummary.Add($"-{neededQty} {req.Unit} de {match.Name}");

                    if (newQty <= 0)
                    {
                        await _inventoryRepo.DeleteAsync(match.Id, houseId);
                    }
                    else
                    {
                        await _inventoryRepo.UpdateAsync(match);
                    }
                }
            }

            // Obtener nombre del usuario que cocinó
            string userName = userId;
            if (_userRepo != null)
            {
                var user = await _userRepo.GetByIdAsync(userId);
                if (user != null && !string.IsNullOrWhiteSpace(user.FullName))
                {
                    userName = user.FullName;
                }
            }

            var notificationMsg = $"{userName} ha cocinado '{recipe.Title}' en Modo Cocina Manos Libres. ¡Buen provecho!";

            // Notificar al chat del hogar
            if (_socialService != null)
            {
                try
                {
                    var affectedProducts = recipe.Ingredients.Select(req => new ActionProductItemDto(
                        ProductName: req.Name,
                        Quantity: req.Quantity * multiplier,
                        Unit: req.Unit,
                        ImageUrl: null
                    )).ToList();

                    await _socialService.PostMessageAsync(houseId, userId, new CreateHouseMessageDto(
                        Content: notificationMsg,
                        MessageType: "SYSTEM_ACTION",
                        MediaUrl: null,
                        MediaThumbnailUrl: null,
                        ActionMetadata: new HouseMessageActionMetadataDto(
                            ActionType: "COOKED_RECIPE",
                            PerformedBy: userId,
                            PerformedByName: userName,
                            AffectedProducts: affectedProducts,
                            StockRemaining: null,
                            TotalAdded: null,
                            StoreName: null
                        )
                    ));
                }
                catch
                {
                    // No bloquear la respuesta si el chat tiene algún retraso transitorio
                }
            }

            return new CompleteCookingResultDto(
                RecipeId: recipe.Id,
                RecipeTitle: recipe.Title,
                ItemsDeductedCount: deductedSummary.Count,
                DeductedItemsSummary: deductedSummary,
                ChatNotificationMessage: notificationMsg
            );
        }

        private static RecipeDto MapToDto(Recipe r, List<InventoryItem> inventory, HashSet<Guid> favoriteIds)
        {
            List<RecipeStepDto> steps = new();
            var jsonToParse = !string.IsNullOrEmpty(r.StepsJson) && r.StepsJson != "[]"
                ? r.StepsJson
                : r.InstructionsJson;

            try
            {
                if (!string.IsNullOrEmpty(jsonToParse))
                {
                    steps = JsonSerializer.Deserialize<List<RecipeStepDto>>(jsonToParse, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new List<RecipeStepDto>();
                }
            }
            catch
            {
                steps = new List<RecipeStepDto>();
            }

            var ingDtos = new List<RecipeIngredientDto>();
            int availableCount = 0;

            foreach (var i in r.Ingredients)
            {
                var lowerName = i.Name.ToLowerInvariant();
                var pItem = inventory.FirstOrDefault(inv =>
                    inv.Name.ToLowerInvariant().Contains(lowerName) || lowerName.Contains(inv.Name.ToLowerInvariant()));

                if (pItem != null)
                {
                    bool isUrgent = pItem.UrgencyLevel == ItemUrgency.Red || pItem.UrgencyLevel == ItemUrgency.Amber;
                    bool hasEnough = pItem.Quantity >= i.Quantity;
                    var status = !hasEnough ? "Faltante" : (isUrgent ? "Prioritario" : "Disponible");
                    var deficit = Math.Max(0, i.Quantity - pItem.Quantity);

                    if (hasEnough) availableCount++;

                    ingDtos.Add(new RecipeIngredientDto(
                        Name: i.Name,
                        Quantity: i.Quantity,
                        Unit: i.Unit,
                        Status: status,
                        AvailableQuantity: pItem.Quantity,
                        DeficitQuantity: deficit,
                        IsExpiringSoon: isUrgent
                    ));
                }
                else
                {
                    ingDtos.Add(new RecipeIngredientDto(
                        Name: i.Name,
                        Quantity: i.Quantity,
                        Unit: i.Unit,
                        Status: "Faltante",
                        AvailableQuantity: 0,
                        DeficitQuantity: i.Quantity,
                        IsExpiringSoon: false
                    ));
                }
            }

            int total = ingDtos.Count;
            int matchPercent = total > 0 ? (int)Math.Round((double)availableCount / total * 100) : 100;
            bool canCook = total > 0 && availableCount == total;

            return new RecipeDto(
                Id: r.Id,
                HouseId: r.HouseId,
                Title: r.Title,
                Subtitle: r.Subtitle ?? $"{r.Servings} personas · Con lo que tienes en casa",
                Description: r.Description,
                Steps: steps,
                Ingredients: ingDtos,
                Servings: r.Servings,
                TotalTimeMinutes: r.TotalTimeMinutes > 0 ? r.TotalTimeMinutes : r.PrepTimeMinutes,
                Difficulty: r.Difficulty ?? "Media",
                CaloriesKcal: r.CaloriesKcal > 0 ? r.CaloriesKcal : 450,
                PantryMatchPercentage: matchPercent,
                SourceType: r.SourceType ?? "AI_GENERATED",
                ImageUrl: r.ImageUrl,
                Source: r.Source,
                CanCookWithCurrentStock: canCook,
                IsFavorite: favoriteIds.Contains(r.Id),
                CreatedBy: r.CreatedBy ?? r.CreatedByUserId,
                PrepTimeMinutes: r.PrepTimeMinutes
            );
        }
    }
}
