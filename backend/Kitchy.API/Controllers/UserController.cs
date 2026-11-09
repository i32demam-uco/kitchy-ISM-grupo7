using System;
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
    public class UserController : BaseKitchyController
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        /// <summary>
        /// Obtiene el perfil completo del usuario autenticado (requiere Bearer Token).
        /// </summary>
        [HttpGet("profile")]
        public async Task<ActionResult<UserProfileDto>> GetProfile()
        {
            var profile = await _userService.GetProfileAsync(CurrentUserId);
            if (profile == null)
            {
                return NotFound(new { message = "Usuario no encontrado." });
            }
            return Ok(profile);
        }

        /// <summary>
        /// Actualiza los datos de perfil (nombre, avatar) del usuario autenticado.
        /// </summary>
        [HttpPut("profile")]
        public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var updated = await _userService.UpdateProfileAsync(CurrentUserId, dto);
            if (updated == null)
            {
                return NotFound(new { message = "Usuario no encontrado." });
            }
            return Ok(updated);
        }

        /// <summary>
        /// Cambia la contraseña del usuario verificando criptográficamente la actual con BCrypt.
        /// </summary>
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "La nueva contraseña debe tener al menos 6 caracteres." });
            }

            var success = await _userService.ChangePasswordAsync(CurrentUserId, dto);
            if (!success)
            {
                return BadRequest(new { message = "La contraseña actual no es válida o no se pudo actualizar." });
            }

            return Ok(new { message = "Contraseña actualizada exitosamente." });
        }
    }
}

