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

        public RecipeService(
            IRecipeRepository recipeRepo,
            IInventoryRepository inventoryRepo)
        {
            _recipeRepo = recipeRepo;
            _inventoryRepo = inventoryRepo;
        }

        public async Task<List<RecipeDto>> GetRecipesAsync(Guid houseId)
        {
            var recipes = await _recipeRepo.GetAvailableRecipesAsync(houseId);
            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);

            return recipes.Select(r => MapToDto(r, inventory)).ToList();
        }

        public async Task<List<RecipeDto>> GetExpiringProductSuggestionsAsync(Guid houseId)
        {
            // Get items expiring in <= 48 hours (Red and Amber)
            var urgentItems = await _inventoryRepo.GetUrgentByHouseAsync(houseId, hoursThreshold: 48);
            var urgentNames = urgentItems.Select(u => u.Name.Trim().ToLower()).ToList();

            var allRecipes = await _recipeRepo.GetAvailableRecipesAsync(houseId);
            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);

            if (!urgentNames.Any())
            {
                // Fallback to top recipes
                return allRecipes.Take(5).Select(r => MapToDto(r, inventory)).ToList();
            }

            // Rank recipes by how many urgent ingredients they contain
            var scored = allRecipes
                .Select(r =>
                {
                    int matchCount = r.Ingredients.Count(ing =>
                        urgentNames.Any(u => ing.Name.ToLower().Contains(u) || u.Contains(ing.Name.ToLower())));
                    return new { Recipe = r, Score = matchCount };
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .Select(x => MapToDto(x.Recipe, inventory))
                .ToList();

            return scored.Any() ? scored : allRecipes.Take(3).Select(r => MapToDto(r, inventory)).ToList();
        }

        public async Task<RecipeDto?> GetRecipeByIdAsync(Guid recipeId, Guid houseId)
        {
            var recipe = await _recipeRepo.GetByIdAsync(recipeId);
            if (recipe == null) return null;

            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            return MapToDto(recipe, inventory);
        }

        public async Task<RecipeDto> CreateRecipeAsync(Guid houseId, string userId, CreateRecipeDto dto)
        {
            var recipe = new Recipe
            {
                HouseId = houseId,
                Title = dto.Title,
                Description = dto.Description,
                Servings = dto.Servings,
                PrepTimeMinutes = dto.PrepTimeMinutes,
                ImageUrl = dto.ImageUrl,
                Source = "UserCustom",
                CreatedByUserId = userId,
                InstructionsJson = JsonSerializer.Serialize(dto.Steps),
                Ingredients = dto.Ingredients.Select(i => new RecipeIngredient
                {
                    Name = i.Name,
                    Quantity = i.Quantity,
                    Unit = i.Unit
                }).ToList()
            };

            var created = await _recipeRepo.AddAsync(recipe);
            var inventory = await _inventoryRepo.GetByHouseAsync(houseId);
            return MapToDto(created, inventory);
        }

        private static RecipeDto MapToDto(Recipe r, List<InventoryItem> inventory)
        {
            List<RecipeStepDto> steps = new();
            try
            {
                if (!string.IsNullOrEmpty(r.InstructionsJson))
                {
                    steps = JsonSerializer.Deserialize<List<RecipeStepDto>>(r.InstructionsJson, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    }) ?? new List<RecipeStepDto>();
                }
            }
            catch
            {
                steps = new List<RecipeStepDto>();
            }

            var ingDtos = r.Ingredients.Select(i => new RecipeIngredientDto(
                Name: i.Name,
                Quantity: i.Quantity,
                Unit: i.Unit
            )).ToList();

            // Check if pantry has all ingredients
            bool canCook = r.Ingredients.All(req =>
                inventory.Any(inv => inv.Name.Contains(req.Name, StringComparison.OrdinalIgnoreCase)
                                     || req.Name.Contains(inv.Name, StringComparison.OrdinalIgnoreCase)));

            return new RecipeDto(
                Id: r.Id,
                HouseId: r.HouseId,
                Title: r.Title,
                Description: r.Description,
                Steps: steps,
                Ingredients: ingDtos,
                Servings: r.Servings,
                PrepTimeMinutes: r.PrepTimeMinutes,
                ImageUrl: r.ImageUrl,
                Source: r.Source,
                CanCookWithCurrentStock: canCook
            );
        }
    }
}

