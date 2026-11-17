using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Enums;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    /// <summary>
    /// RecipeDeltaService - Algoritmo Delta Culinario y Conciliación de Despensa.
    /// 
    /// Clasifica cada ingrediente en tres estados estrictos:
    /// 1. Disponible: Stock suficiente en despensa con caducidad segura (> 48h).
    /// 2. Prioritario: Alimento en despensa que caduca en 24-48 horas (UrgencyLevel Red / Amber), forzando su consumo.
    /// 3. Faltante: Stock insuficiente o inexistente, con cálculo matemático exacto de déficit para lista de compra.
    /// </summary>
    public class RecipeDeltaService : IRecipeDeltaService
    {
        private readonly IRecipeRepository _recipeRepository;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IShoppingListRepository _shoppingListRepository;

        public RecipeDeltaService(
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
                throw new KeyNotFoundException($"Receta con ID {recipeId} no encontrada.");
            }

            var inventoryItems = await _inventoryRepository.GetByHouseAsync(houseId);
            return ComputeDeltaInternal(recipe.Id, recipe.Title, recipe.Ingredients.Select(i => new RecipeIngredientDto(i.Name, i.Quantity, i.Unit)).ToList(), inventoryItems);
        }

        public async Task<RecipeDeltaCalculationDto> CalculateDeltaForDtoAsync(Guid houseId, RecipeDto recipe)
        {
            var inventoryItems = await _inventoryRepository.GetByHouseAsync(houseId);
            return ComputeDeltaInternal(recipe.Id, recipe.Title, recipe.Ingredients, inventoryItems);
        }

        private RecipeDeltaCalculationDto ComputeDeltaInternal(
            Guid recipeId,
            string recipeTitle,
            List<RecipeIngredientDto> requiredIngredients,
            List<InventoryItem> inventoryItems)
        {
            var deltaList = new List<MissingIngredientDto>();
            int urgentCount = 0;

            foreach (var required in requiredIngredients)
            {
                var matchingPantryItems = inventoryItems
                    .Where(i => IsMatch(i.Name, required.Name))
                    .ToList();

                decimal totalAvailable = 0;
                bool isAnyExpiringSoon = false;

                foreach (var item in matchingPantryItems)
                {
                    totalAvailable += ConvertUnitQuantity(item.Quantity, item.Unit, required.Unit);
                    if (item.UrgencyLevel == ItemUrgency.Red || item.UrgencyLevel == ItemUrgency.Amber)
                    {
                        isAnyExpiringSoon = true;
                    }
                }

                var deficit = Math.Max(0, required.Quantity - totalAvailable);
                var isMissing = deficit > 0;

                string status;
                if (isMissing)
                {
                    status = "Faltante";
                }
                else if (isAnyExpiringSoon)
                {
                    status = "Prioritario";
                    urgentCount++;
                }
                else
                {
                    status = "Disponible";
                }

                deltaList.Add(new MissingIngredientDto(
                    Name: required.Name,
                    RequiredQuantity: required.Quantity,
                    AvailableQuantity: Math.Round(totalAvailable, 2),
                    DeficitQuantity: Math.Round(deficit, 2),
                    Unit: required.Unit,
                    IsMissing: isMissing,
                    Status: status,
                    IsExpiringSoon: isAnyExpiringSoon
                ));
            }

            var missingCount = deltaList.Count(d => d.IsMissing);
            var availableCount = deltaList.Count(d => !d.IsMissing);
            int matchPercent = deltaList.Count > 0 ? (int)Math.Round((double)availableCount / deltaList.Count * 100) : 100;

            return new RecipeDeltaCalculationDto(
                RecipeId: recipeId,
                RecipeTitle: recipeTitle,
                CanCookNow: missingCount == 0,
                TotalIngredientsCount: deltaList.Count,
                MissingIngredientsCount: missingCount,
                Ingredients: deltaList,
                PantryMatchPercentage: matchPercent,
                UrgentIngredientsCount: urgentCount
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
                var filterSet = new HashSet<string>(request.IngredientNames.Select(n => n.Trim().ToLowerInvariant()));
                missingToInsert = missingToInsert.Where(i => filterSet.Contains(i.Name.Trim().ToLowerInvariant()));
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
                    Source = ItemSource.RecipeDelta.ToString(),
                    AddedByUserId = userId
                });
            }

            var added = await _shoppingListRepository.AddRangeAsync(itemsToAdd);

            return new SendDeltaToShoppingListResponse(
                ItemsAddedCount: added.Count,
                AddedItems: added.Select(a => new ShoppingListItemDto(
                    a.Id, a.HouseId, a.MasterProductId, a.Name, a.Quantity, a.Unit,
                    a.IsChecked, a.Source, a.AddedByUserId, a.AssignedToUserId,
                    a.CreatedAt, a.MasterProduct?.ImageUrl
                )).ToList()
            );
        }

        private static bool IsMatch(string inventoryName, string requiredName)
        {
            if (string.IsNullOrWhiteSpace(inventoryName) || string.IsNullOrWhiteSpace(requiredName)) return false;

            var inv = inventoryName.Trim().ToLowerInvariant();
            var req = requiredName.Trim().ToLowerInvariant();

            if (inv == req) return true;
            if (inv.Contains(req) || req.Contains(inv)) return true;

            var invWords = inv.Split(new[] { ' ', ',', '-', '.' }, StringSplitOptions.RemoveEmptyEntries)
                              .Where(w => w.Length > 2)
                              .ToList();
            var reqWords = req.Split(new[] { ' ', ',', '-', '.' }, StringSplitOptions.RemoveEmptyEntries)
                              .Where(w => w.Length > 2)
                              .ToList();

            return invWords.Any(iw => reqWords.Contains(iw));
        }

        private static decimal ConvertUnitQuantity(decimal sourceQty, string sourceUnit, string targetUnit)
        {
            var s = (sourceUnit ?? "").Trim().ToLowerInvariant();
            var t = (targetUnit ?? "").Trim().ToLowerInvariant();

            if (s == t) return sourceQty;

            // Gramos y Kilogramos
            if (s == "kg" && (t == "g" || t == "gramos")) return sourceQty * 1000m;
            if ((s == "g" || s == "gramos") && t == "kg") return sourceQty / 1000m;

            // Litros y Mililitros
            if ((s == "l" || s == "litros") && (t == "ml" || t == "mililitros")) return sourceQty * 1000m;
            if ((s == "ml" || s == "mililitros") && (t == "l" || t == "litros")) return sourceQty / 1000m;

            // Unidades equivalentes
            if ((s == "ud" || s == "ud." || s == "unidades") && (t == "ud" || t == "ud." || t == "unidades"))
                return sourceQty;

            return sourceQty;
        }
    }
}
