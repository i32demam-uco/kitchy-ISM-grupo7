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
    public class BarcodeController : BaseKitchyController
    {
        private readonly IOpenFoodFactsService _offService;
        private readonly IImageMatchingService _imageMatchingService;

        public BarcodeController(IOpenFoodFactsService offService, IImageMatchingService imageMatchingService)
        {
            _offService = offService;
            _imageMatchingService = imageMatchingService;
        }

        [HttpGet("{barcode}")]
        public async Task<ActionResult<BarcodeProductDto>> GetProductByBarcode(string barcode)
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                return BadRequest("Barcode is required.");
            }

            var product = await _offService.FetchProductByBarcodeAsync(barcode);
            if (product == null) return NotFound("Product not found in Open Food Facts or local catalog.");

            return Ok(product);
        }

        [HttpGet("match-image")]
        public async Task<ActionResult<ImageMatchResultDto>> MatchImage([FromQuery] string name, [FromQuery] string? category = null, [FromQuery] string? barcode = null)
        {
            if (string.IsNullOrWhiteSpace(name) && string.IsNullOrWhiteSpace(barcode))
            {
                return BadRequest("Product name or barcode is required.");
            }

            var match = await _imageMatchingService.MatchImageAsync(name, category, barcode);
            return Ok(match);
        }
    }
}

