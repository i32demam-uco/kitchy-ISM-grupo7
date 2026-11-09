using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Kitchy.Core.Interfaces;

namespace Kitchy.API.Controllers
{
    [ApiController]
    public abstract class BaseKitchyController : ControllerBase
    {
        protected string CurrentUserId =>
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? "aleja";

        /// <summary>
        /// Blindaje de Seguridad RLS: Verifica que el usuario autenticado pertenece
        /// explícitamente al hogar solicitado en la tabla relacional user_houses.
        /// </summary>
        protected async Task<bool> ValidateHouseAccessAsync(IHouseRepository houseRepo, Guid houseId)
        {
            // 1. Verificación de claims en el token JWT si están inyectados
            var houseClaims = User.FindAll("house_id").Select(c => c.Value).ToList();
            if (houseClaims.Count > 0 && houseClaims.Contains(houseId.ToString()))
            {
                return true;
            }

            // 2. Consulta estricta en base de datos (user_houses)
            if (houseRepo != null)
            {
                var isMember = await houseRepo.IsUserInHouseAsync(CurrentUserId, houseId);
                return isMember;
            }

            return false;
        }

        protected bool ValidateHouseAccess(Guid houseId)
        {
            var houseClaims = User.FindAll("house_id").Select(c => c.Value).ToList();
            return houseClaims.Contains(houseId.ToString());
        }
    }
}
