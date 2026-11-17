using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Models;

namespace Kitchy.Services.Interfaces
{
    public interface IGeminiRecipeService
    {
        /// <summary>
        /// Genera 3-5 opciones de recetas adaptadas a los ingredientes reales de la despensa,
        /// forzando prioridad en alimentos con caducidad próxima (< 48h), ingredientes forzados por el usuario
        /// y antojos o preferencias específicas (ej. "Tengo antojo de pasta").
        /// Implementa cliente HTTP dual resiliente, temperatura 0.8 para creatividad y fallback heurístico local en 0 ms.
        /// </summary>
        Task<List<RecipeDto>> GenerateRecipeOptionsAsync(
            Guid houseId,
            string currentUserId,
            List<InventoryItem> pantryItems,
            bool forceUrgentPriority = true,
            int maxOptions = 4,
            List<string>? forcedIngredients = null,
            string? cravingPrompt = null
        );
    }
}

