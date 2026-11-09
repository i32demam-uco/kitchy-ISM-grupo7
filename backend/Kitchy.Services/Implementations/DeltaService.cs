using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class DeltaService : IDeltaService
    {
        private readonly IRecipeRepository _recipeRepository;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IShoppingListRepository _shoppingListRepository;

        public DeltaService(
            IRecipeRepository recipeRepository,
            IInventoryRepository inventoryRepository,
            IShoppingListRepository shoppingListRepository)
        {
            _recipeRepository = recipeRepository;
            _inventoryRepository = inventoryRepository;
            _shoppingListRepository = shoppingListRepository;
        }

        public async Task<RecipeDeltaCalculationDto> CalculateDeltaAsync(Guid houseId, Guid recipeId)
        {
            var recipe = await _recipeRepository.GetByIdAsync(recipeId);
            if (recipe == null)
            {
                throw new KeyNotFoundException($"Recipe with ID {recipeId} not found.");
            }

            var inventoryItems = await _inventoryRepository.GetByHouseAsync(houseId);
            var deltaList = new List<MissingIngredientDto>();

            foreach (var required in recipe.Ingredients)
            {
                // Find matching items in inventory by exact or partial name
                var matchingPantryItems = inventoryItems
                    .Where(i => IsMatch(i.Name, required.Name))
                    .ToList();

                decimal totalAvailable = 0;
                foreach (var item in matchingPantryItems)
                {
                    totalAvailable += ConvertUnitQuantity(item.Quantity, item.Unit, required.Unit);
                }

                var deficit = Math.Max(0, required.Quantity - totalAvailable);
                var isMissing = deficit > 0;

                deltaList.Add(new MissingIngredientDto(
                    Name: required.Name,
                    RequiredQuantity: required.Quantity,
                    AvailableQuantity: Math.Round(totalAvailable, 2),
                    DeficitQuantity: Math.Round(deficit, 2),
                    Unit: required.Unit,
                    IsMissing: isMissing
                ));
            }

            var missingCount = deltaList.Count(d => d.IsMissing);

            return new RecipeDeltaCalculationDto(
                RecipeId: recipe.Id,
                RecipeTitle: recipe.Title,
                CanCookNow: missingCount == 0,
                TotalIngredientsCount: deltaList.Count,
                MissingIngredientsCount: missingCount,
                Ingredients: deltaList
            );
        }

        public async Task<SendDeltaToShoppingListResponse> SendDeltaToShoppingListAsync(
            Guid houseId,
            string userId,
            SendDeltaToShoppingListRequest request)
        {
            var delta = await CalculateDeltaAsync(houseId, request.RecipeId);
            var missingToInsert = delta.Ingredients.Where(i => i.IsMissing);

            if (request.IngredientNames != null && request.IngredientNames.Any())
            {
                var filterSet = new HashSet<string>(request.IngredientNames.Select(n => n.Trim().ToLower()));
                missingToInsert = missingToInsert.Where(i => filterSet.Contains(i.Name.Trim().ToLower()));
            }

            var itemsToAdd = new List<ShoppingListItem>();
            foreach (var item in missingToInsert)
            {
                itemsToAdd.Add(new ShoppingListItem
                {
                    HouseId = houseId,
                    Name = item.Name,
                    Quantity = item.DeficitQuantity > 0 ? item.DeficitQuantity : 1,
                    Unit = item.Unit,
                    IsChecked = false,
                    Source = "RecipeDelta",
                    AddedByUserId = userId
                });
            }

            if (!itemsToAdd.Any())
            {
                return new SendDeltaToShoppingListResponse(0, new List<ShoppingListItemDto>());
            }

            var savedItems = await _shoppingListRepository.AddRangeAsync(itemsToAdd);

            var resultDtos = savedItems.Select(s => new ShoppingListItemDto(
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
                ImageUrl: null
            )).ToList();

            return new SendDeltaToShoppingListResponse(resultDtos.Count, resultDtos);
        }

        private static bool IsMatch(string inventoryName, string recipeIngredientName)
        {
            var inv = inventoryName.Trim().ToLower();
            var rec = recipeIngredientName.Trim().ToLower();

            if (inv == rec) return true;
            if (inv.Contains(rec) || rec.Contains(inv)) return true;

            // Common keyword match (e.g. "Pollo", "Huevos", "Tomate")
            var invWords = inv.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var recWords = rec.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return invWords.Any(w => w.Length > 3 && recWords.Contains(w));
        }

        private static decimal ConvertUnitQuantity(decimal sourceQty, string sourceUnit, string targetUnit)
        {
            var s = sourceUnit.Trim().ToLower();
            var t = targetUnit.Trim().ToLower();

            if (s == t) return sourceQty;

            // Kilograms <-> Grams
            if ((s == "kg" || s == "kilo") && t == "g") return sourceQty * 1000m;
            if (s == "g" && (t == "kg" || t == "kilo")) return sourceQty / 1000m;

            // Liters <-> Milliliters
            if ((s == "l" || s == "litro") && (t == "ml" || t == "mililitros")) return sourceQty * 1000m;
            if ((s == "ml" || s == "mililitros") && (t == "l" || t == "litro")) return sourceQty / 1000m;

            // Fallback: direct quantity if units don't translate or are unit-based
            return sourceQty;
        }
    }
}

