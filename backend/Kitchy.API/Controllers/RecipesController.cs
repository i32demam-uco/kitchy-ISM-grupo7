using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Services.Interfaces;

namespace Kitchy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RecipesController : BaseKitchyController
    {
        private readonly IRecipeService _recipeService;
        private readonly IGeminiRecipeService _geminiRecipeService;
        private readonly IInventoryRepository _inventoryRepository;
        private readonly IHouseSocialService _socialService;
        private readonly IUserRepository _userRepository;

        public RecipesController(
            IRecipeService recipeService,
            IGeminiRecipeService geminiRecipeService,
            IInventoryRepository inventoryRepository,
            IHouseSocialService socialService,
            IUserRepository userRepository)
        {
            _recipeService = recipeService;
            _geminiRecipeService = geminiRecipeService;
            _inventoryRepository = inventoryRepository;
            _socialService = socialService;
            _userRepository = userRepository;
        }

        [HttpGet]
        public async Task<ActionResult<List<RecipeDto>>> GetRecipes([FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var recipes = await _recipeService.GetRecipesAsync(houseId, CurrentUserId);
            return Ok(recipes);
        }

        [HttpGet("suggested")]
        public async Task<ActionResult<List<RecipeDto>>> GetExpiringSuggestions([FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var suggestions = await _recipeService.GetExpiringProductSuggestionsAsync(houseId);
            return Ok(suggestions);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<RecipeDto>> GetRecipeById(Guid id, [FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var recipe = await _recipeService.GetRecipeByIdAsync(id, houseId, CurrentUserId);
            if (recipe == null) return NotFound();

            return Ok(recipe);
        }

        /// <summary>
        /// POST /api/recipes/generate-options
        /// Lee "Tu Despensa" de la casa y genera 3-4 opciones con Gemini AI (o motor heurístico local),
        /// forzando prioridad en alimentos urgentes que caduquen en 24-48h.
        /// </summary>
        [HttpPost("generate-options")]
        public async Task<ActionResult<List<RecipeDto>>> GenerateRecipeOptions(
            [FromQuery] Guid houseId,
            [FromBody] GenerateRecipeOptionsRequestDto? request = null)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var pantryItems = await _inventoryRepository.GetByHouseAsync(houseId);
            bool forceUrgent = request?.ForceUrgentPriority ?? true;
            int maxOptions = request?.MaxOptions ?? 4;

            var options = await _geminiRecipeService.GenerateRecipeOptionsAsync(
                houseId,
                CurrentUserId,
                pantryItems,
                forceUrgent,
                maxOptions,
                request?.ForcedIngredients,
                request?.CravingPrompt
            );

            return Ok(options);
        }

        /// <summary>
        /// POST /api/recipes/create
        /// Crea una receta desde cero.
        /// </summary>
        [HttpPost("create")]
        public async Task<ActionResult<RecipeDto>> CreateRecipe([FromQuery] Guid houseId, [FromBody] CreateRecipeDto dto)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var created = await _recipeService.CreateRecipeAsync(houseId, CurrentUserId, dto);
            return CreatedAtAction(nameof(GetRecipeById), new { id = created.Id, houseId }, created);
        }

        /// <summary>
        /// PUT /api/recipes/{id}
        /// Modifica cualquier receta existente.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<RecipeDto>> UpdateRecipe(Guid id, [FromQuery] Guid houseId, [FromBody] UpdateRecipeDto dto)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var updated = await _recipeService.UpdateRecipeAsync(id, houseId, CurrentUserId, dto);
            if (updated == null) return NotFound();

            return Ok(updated);
        }

        /// <summary>
        /// POST /api/recipes/{id}/favorite
        /// Conmuta el estado de favorito de la receta para el usuario actual.
        /// </summary>
        [HttpPost("{id}/favorite")]
        public async Task<ActionResult<object>> ToggleFavorite(Guid id, [FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var isFav = await _recipeService.ToggleFavoriteAsync(id, CurrentUserId);
            return Ok(new { recipeId = id, isFavorite = isFav });
        }

        /// <summary>
        /// POST /api/recipes/{id}/share-to-chat
        /// Comparte la ficha de la receta en el chat del hogar vía SignalR.
        /// </summary>
        [HttpPost("{id}/share-to-chat")]
        public async Task<ActionResult<object>> ShareToChat(Guid id, [FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var recipe = await _recipeService.GetRecipeByIdAsync(id, houseId, CurrentUserId);
            if (recipe == null) return NotFound("Receta no encontrada.");

            var user = await _userRepository.GetByIdAsync(CurrentUserId);
            var userName = user?.FullName ?? CurrentUserId;

            var content = $"{userName} ha compartido la receta '{recipe.Title}' con el hogar. ¡Tiene un {recipe.PantryMatchPercentage}% de ingredientes disponibles!";

            var message = await _socialService.PostMessageAsync(houseId, CurrentUserId, new CreateHouseMessageDto(
                Content: content,
                MessageType: "SYSTEM_ACTION",
                MediaUrl: null,
                MediaThumbnailUrl: null,
                ActionMetadata: new HouseMessageActionMetadataDto(
                    ActionType: "SHARED_RECIPE",
                    PerformedBy: CurrentUserId,
                    PerformedByName: userName,
                    AffectedProducts: recipe.Ingredients.Select(i => new ActionProductItemDto(i.Name, i.Quantity, i.Unit, null)).ToList(),
                    StockRemaining: null,
                    TotalAdded: null,
                    StoreName: null
                )
            ));

            return Ok(new { success = true, message });
        }

        /// <summary>
        /// POST /api/recipes/{id}/complete-cooking
        /// Descuenta los ingredientes usados de la base de datos de inventario y notifica al chat del hogar.
        /// </summary>
        [HttpPost("{id}/complete-cooking")]
        public async Task<ActionResult<CompleteCookingResultDto>> CompleteCooking(
            Guid id,
            [FromQuery] Guid houseId,
            [FromBody] CompleteCookingRequestDto? dto = null)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            try
            {
                var result = await _recipeService.CompleteCookingAsync(
                    id,
                    houseId,
                    CurrentUserId,
                    dto ?? new CompleteCookingRequestDto()
                );
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}
