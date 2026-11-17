using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Kitchy.API.Hubs;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Services.Interfaces;

namespace Kitchy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InventoryController : BaseKitchyController
    {
        private readonly IInventoryService _inventoryService;
        private readonly IHouseRepository _houseRepo;
        private readonly IHubContext<KitchyHub, IKitchyClient> _hubContext;

        public InventoryController(
            IInventoryService inventoryService,
            IHouseRepository houseRepo,
            IHubContext<KitchyHub, IKitchyClient> hubContext)
        {
            _inventoryService = inventoryService;
            _houseRepo = houseRepo;
            _hubContext = hubContext;
        }

        [HttpGet]
        [HttpGet("list")]
        public async Task<ActionResult<List<InventoryItemDto>>> GetInventory([FromQuery] Guid houseId)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId)) return Forbid();

            var items = await _inventoryService.GetInventoryAsync(houseId);
            return Ok(items);
        }

        [HttpGet("urgencies")]
        public async Task<ActionResult<UrgentItemsSummaryDto>> GetUrgencies([FromQuery] Guid houseId)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId)) return Forbid();

            var summary = await _inventoryService.GetUrgentSummaryAsync(houseId);
            return Ok(summary);
        }

        [HttpPost]
        [HttpPost("add")]
        public async Task<ActionResult<InventoryItemDto>> AddItem([FromBody] CreateInventoryItemDto dto, [FromQuery] Guid? houseId = null)
        {
            var targetHouseId = houseId ?? dto.HouseId ?? Guid.Empty;
            if (targetHouseId == Guid.Empty) return BadRequest(new { message = "HouseId is required" });
            if (!await ValidateHouseAccessAsync(_houseRepo, targetHouseId)) return Forbid();

            var created = await _inventoryService.AddItemAsync(targetHouseId, CurrentUserId, dto);

            // SignalR broadcast
            await _hubContext.Clients.Group($"house_{targetHouseId}").InventoryUpdated("Add", created);

            return CreatedAtAction(nameof(GetInventory), new { houseId = targetHouseId }, created);
        }

        [HttpPut("{id}")]
        [HttpPut("update/{id}")]
        public async Task<ActionResult<InventoryItemDto>> UpdateItem(
            Guid id,
            [FromQuery] Guid houseId,
            [FromBody] UpdateInventoryItemDto dto)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId)) return Forbid();

            var updated = await _inventoryService.UpdateItemAsync(houseId, id, dto);
            if (updated == null) return NotFound();

            // SignalR broadcast
            await _hubContext.Clients.Group($"house_{houseId}").InventoryUpdated("Update", updated);

            return Ok(updated);
        }

        [HttpPost("update")]
        [HttpPut("update")]
        public async Task<ActionResult<InventoryItemDto>> UpdateItemGeneric(
            [FromBody] UpdateInventoryItemDto dto,
            [FromQuery] Guid? houseId = null,
            [FromQuery] Guid? id = null)
        {
            var targetHouseId = houseId ?? dto.HouseId ?? Guid.Empty;
            var targetId = id ?? dto.ItemId ?? Guid.Empty;
            if (targetHouseId == Guid.Empty || targetId == Guid.Empty)
            {
                return BadRequest(new { message = "HouseId and ItemId are required" });
            }

            if (!await ValidateHouseAccessAsync(_houseRepo, targetHouseId)) return Forbid();

            var updated = await _inventoryService.UpdateItemAsync(targetHouseId, targetId, dto);
            if (updated == null) return NotFound();

            await _hubContext.Clients.Group($"house_{targetHouseId}").InventoryUpdated("Update", updated);
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteItem(Guid id, [FromQuery] Guid houseId)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId)) return Forbid();

            var deleted = await _inventoryService.DeleteItemAsync(houseId, id);
            if (!deleted) return NotFound();

            // SignalR broadcast
            await _hubContext.Clients.Group($"house_{houseId}").InventoryUpdated("Delete", new { Id = id });

            return NoContent();
        }

        [HttpPost("discard")]
        public async Task<IActionResult> DiscardAndAddToShoppingList([FromQuery] Guid houseId, [FromQuery] string barcode)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId)) return Forbid();

            var success = await _inventoryService.DiscardAndAddToShoppingListAsync(houseId, CurrentUserId, barcode);
            if (!success) return NotFound("Item with barcode not found in house inventory.");

            // SignalR broadcasts for both inventory decrement and shopping list increment
            await _hubContext.Clients.Group($"house_{houseId}").InventoryUpdated("Discard", new { Barcode = barcode });
            await _hubContext.Clients.Group($"house_{houseId}").ShoppingListUpdated("AddFromDiscard", new { Barcode = barcode });

            return Ok(new { Success = true, Message = "Product discarded and added to collaborative shopping list." });
        }

        [HttpPost("{id}/consume")]
        [HttpPost("consume/{id}")]
        public async Task<ActionResult<InventoryItemDto>> ConsumeItem(
            Guid id,
            [FromQuery] Guid houseId,
            [FromBody] ConsumeProductRequestDto dto)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId)) return Forbid();

            var quantity = dto?.Quantity > 0 ? dto.Quantity : 1;
            var updated = await _inventoryService.ConsumeItemAsync(houseId, CurrentUserId, id, quantity);
            if (updated == null) return NotFound();

            return Ok(updated);
        }
    }
}

