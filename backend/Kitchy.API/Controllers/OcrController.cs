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
    public class OcrController : BaseKitchyController
    {
        private readonly IOcrService _ocrService;
        private readonly IHubContext<KitchyHub, IKitchyClient> _hubContext;

        public OcrController(
            IOcrService ocrService,
            IHubContext<KitchyHub, IKitchyClient> hubContext)
        {
            _ocrService = ocrService;
            _hubContext = hubContext;
        }

        [HttpPost("parse-ticket")]
        public ActionResult<OcrTicketResultDto> ParseTicket([FromBody] ProcessTicketRequestDto request)
        {
            var result = _ocrService.ParseReceiptText(request.RawOcrText ?? string.Empty);
            return Ok(result);
        }

        [HttpPost("batch-confirm")]
        public async Task<ActionResult<List<InventoryItemDto>>> BatchConfirm(
            [FromQuery] Guid houseId,
            [FromBody] BatchConfirmOcrRequest request)
        {
            if (!ValidateHouseAccess(houseId)) return Forbid();

            var savedItems = await _ocrService.BatchConfirmOcrAsync(houseId, CurrentUserId, request.Products);

            // SignalR broadcast
            await _hubContext.Clients.Group($"house_{houseId}").InventoryUpdated("BatchAddOCR", savedItems);

            return Ok(savedItems);
        }
    }
}

