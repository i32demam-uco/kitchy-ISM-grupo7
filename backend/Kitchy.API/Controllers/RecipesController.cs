using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Kitchy.Core.DTOs;
using Kitchy.Services.Interfaces;

namespace Kitchy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RecipesController : BaseKitchyController
    {
        private readonly IRecipeService _recipeService;

        public RecipesController(IRecipeService recipeService)
        {
            _recipeService = recipeService;
        }

        [HttpGet]
        public async Task<ActionResult<List<RecipeDto>>> GetRecipes([FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var recipes = await _recipeService.GetRecipesAsync(houseId);
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

            var recipe = await _recipeService.GetRecipeByIdAsync(id, houseId);
            if (recipe == null) return NotFound();

            return Ok(recipe);
        }

        [HttpPost]
        public async Task<ActionResult<RecipeDto>> CreateRecipe([FromQuery] Guid houseId, [FromBody] CreateRecipeDto dto)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var created = await _recipeService.CreateRecipeAsync(houseId, CurrentUserId, dto);
            return CreatedAtAction(nameof(GetRecipeById), new { id = created.Id, houseId }, created);
        }
    }
}

