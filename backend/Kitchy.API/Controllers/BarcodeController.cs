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

        public BarcodeController(IOpenFoodFactsService offService)
        {
            _offService = offService;
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
    }
}

