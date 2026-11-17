using System;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;

namespace Kitchy.Services.Interfaces
{
    public interface IRecipeDeltaService
    {
        Task<RecipeDeltaCalculationDto> CalculateDeltaAsync(Guid houseId, Guid recipeId);
        Task<RecipeDeltaCalculationDto> CalculateDeltaForDtoAsync(Guid houseId, RecipeDto recipe);
        Task<SendDeltaToShoppingListResponse> SendDeltaToShoppingListAsync(
            Guid houseId,
            string userId,
            SendDeltaToShoppingListRequest request);
    }
}

