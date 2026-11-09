using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Kitchy.API.Hubs;
using Kitchy.Core.DTOs;
using Kitchy.Services.Interfaces;

namespace Kitchy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DeltaController : BaseKitchyController
    {
        private readonly IDeltaService _deltaService;
        private readonly IHubContext<KitchyHub, IKitchyClient> _hubContext;

        public DeltaController(
            IDeltaService deltaService,
            IHubContext<KitchyHub, IKitchyClient> hubContext)
        {
            _deltaService = deltaService;
            _hubContext = hubContext;
        }

        [HttpGet("calculate")]
        public async Task<ActionResult<RecipeDeltaCalculationDto>> CalculateDelta(
            [FromQuery] Guid houseId,
            [FromQuery] Guid recipeId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            try
            {
                var result = await _deltaService.CalculateDeltaAsync(houseId, recipeId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        [HttpPost("send-to-shopping-list")]
        public async Task<ActionResult<SendDeltaToShoppingListResponse>> SendDeltaToShoppingList(
            [FromQuery] Guid houseId,
            [FromBody] SendDeltaToShoppingListRequest request)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var response = await _deltaService.SendDeltaToShoppingListAsync(houseId, CurrentUserId, request);

            if (response.ItemsAddedCount > 0)
            {
                // SignalR broadcast: notify all house members of new items added via recipe delta
                await _hubContext.Clients.Group($"house_{houseId}").ShoppingListUpdated("BulkAddDelta", response.AddedItems);
            }

            return Ok(response);
        }
    }
}

