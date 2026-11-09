using System;
using System.Collections.Generic;
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
    public class ShoppingListController : BaseKitchyController
    {
        private readonly IShoppingListService _shoppingService;
        private readonly IHubContext<KitchyHub, IKitchyClient> _hubContext;

        public ShoppingListController(
            IShoppingListService shoppingService,
            IHubContext<KitchyHub, IKitchyClient> hubContext)
        {
            _shoppingService = shoppingService;
            _hubContext = hubContext;
        }

        [HttpGet]
        public async Task<ActionResult<List<ShoppingListItemDto>>> GetShoppingList([FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var items = await _shoppingService.GetShoppingListAsync(houseId);
            return Ok(items);
        }

        [HttpPost]
        public async Task<ActionResult<ShoppingListItemDto>> AddItem(
            [FromQuery] Guid houseId,
            [FromBody] CreateShoppingItemDto dto)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var created = await _shoppingService.AddItemAsync(houseId, CurrentUserId, dto);

            // SignalR broadcast (CU-04 Sincronización Multihogar)
            await _hubContext.Clients.Group($"house_{houseId}").ShoppingListUpdated("Add", created);

            return CreatedAtAction(nameof(GetShoppingList), new { houseId }, created);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ShoppingListItemDto>> UpdateItem(
            Guid id,
            [FromQuery] Guid houseId,
            [FromBody] UpdateShoppingItemDto dto)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var updated = await _shoppingService.UpdateItemAsync(houseId, id, dto);
            if (updated == null) return NotFound();

            // SignalR broadcast (CU-04 Sincronización Multihogar)
            await _hubContext.Clients.Group($"house_{houseId}").ShoppingListUpdated("Update", updated);

            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteItem(Guid id, [FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var deleted = await _shoppingService.DeleteItemAsync(houseId, id);
            if (!deleted) return NotFound();

            // SignalR broadcast
            await _hubContext.Clients.Group($"house_{houseId}").ShoppingListUpdated("Delete", new { Id = id });

            return NoContent();
        }

        [HttpPost("clear-checked")]
        public async Task<IActionResult> ClearChecked([FromQuery] Guid houseId)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            await _shoppingService.ClearCheckedAsync(houseId);

            // SignalR broadcast
            await _hubContext.Clients.Group($"house_{houseId}").ShoppingListUpdated("ClearChecked", null);

            return Ok(new { Success = true });
        }
    }
}

