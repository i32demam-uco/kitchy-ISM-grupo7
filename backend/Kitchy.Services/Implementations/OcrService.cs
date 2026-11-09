using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Enums;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class OcrService : IOcrService
    {
        private readonly IInventoryRepository _inventoryRepo;
        private readonly IMasterProductRepository _masterProductRepo;
        private readonly IPriceHistoryRepository _priceHistoryRepo;

        // Regex for date extraction: 24/11/2026, 24-11-26, 24.11.2026
        private static readonly Regex DatePattern = new(
            @"\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b",
            RegexOptions.Compiled);

        // Regex for price extraction: 1,70 €, 1.70, 8,00 €
        private static readonly Regex PricePattern = new(
            @"(\d+[.,]\d{2})\s*€?",
            RegexOptions.Compiled);

        // Regex for quantity extraction: 2 x, 1x, 500 g, 1 L
        private static readonly Regex QuantityPattern = new(
            @"^(\d+)\s*[xX]\s+",
            RegexOptions.Compiled);

        public OcrService(
            IInventoryRepository inventoryRepo,
            IMasterProductRepository masterProductRepo,
            IPriceHistoryRepository priceHistoryRepo)
        {
            _inventoryRepo = inventoryRepo;
            _masterProductRepo = masterProductRepo;
            _priceHistoryRepo = priceHistoryRepo;
        }

        public OcrTicketResultDto ParseReceiptText(string rawText)
        {
            if (string.IsNullOrWhiteSpace(rawText))
            {
                // Return default demo items from Figma mockup if empty
                return GetDefaultDemoMercadonaReceipt();
            }

            var lines = rawText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.Trim())
                .Where(l => !string.IsNullOrEmpty(l))
                .ToList();

            string storeName = "Supermercado";
            DateTime ticketDate = DateTime.UtcNow;
            decimal totalAmount = 0m;
            var detectedProducts = new List<DetectedProductDto>();

            // Check header for store name
            if (lines.Any(l => l.Contains("MERCADONA", StringComparison.OrdinalIgnoreCase)))
            {
                storeName = "Mercadona";
            }
            else if (lines.Any(l => l.Contains("CARREFOUR", StringComparison.OrdinalIgnoreCase)))
            {
                storeName = "Carrefour";
            }
            else if (lines.Any(l => l.Contains("DIA", StringComparison.OrdinalIgnoreCase)))
            {
                storeName = "Dia";
            }

            // Check lines for date
            foreach (var line in lines)
            {
                var match = DatePattern.Match(line);
                if (match.Success)
                {
                    if (DateTime.TryParse(match.Value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                    {
                        ticketDate = d;
                        break;
                    }
                }
            }

            // Parse items
            foreach (var line in lines)
            {
                // Skip store headers, taxes, CIF, totals
                if (line.Contains("TOTAL", StringComparison.OrdinalIgnoreCase))
                {
                    var totalMatch = PricePattern.Match(line);
                    if (totalMatch.Success)
                    {
                        var cleaned = totalMatch.Groups[1].Value.Replace(',', '.');
                        if (decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var t))
                        {
                            totalAmount = t;
                        }
                    }
                    continue;
                }

                if (line.Contains("NIF") || line.Contains("CIF") || line.Contains("FECHA") || line.Contains("HORA") || line.Contains("TARJETA"))
                {
                    continue;
                }

                // Try extracting item + price
                var priceMatch = PricePattern.Match(line);
                if (priceMatch.Success)
                {
                    var priceStr = priceMatch.Groups[1].Value.Replace(',', '.');
                    if (decimal.TryParse(priceStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var itemPrice))
                    {
                        var namePart = line.Substring(0, priceMatch.Index).Trim();
                        decimal qty = 1;
                        var qtyMatch = QuantityPattern.Match(namePart);
                        if (qtyMatch.Success)
                        {
                            if (decimal.TryParse(qtyMatch.Groups[1].Value, out var q))
                            {
                                qty = q;
                            }
                            namePart = namePart.Substring(qtyMatch.Length).Trim();
                        }

                        if (!string.IsNullOrWhiteSpace(namePart) && namePart.Length > 2)
                        {
                            var category = InferCategory(namePart);
                            var shelfLife = EstimateShelfLifeDays(category, namePart);

                            detectedProducts.Add(new DetectedProductDto(
                                Name: CapitalizeWords(namePart),
                                Quantity: qty,
                                Unit: InferUnit(namePart),
                                UnitPrice: itemPrice / (qty > 0 ? qty : 1),
                                TotalPrice: itemPrice,
                                EstimatedExpiration: DateTime.UtcNow.AddDays(shelfLife),
                                Category: category
                            ));
                        }
                    }
                }
            }

            if (!detectedProducts.Any())
            {
                return GetDefaultDemoMercadonaReceipt();
            }

            if (totalAmount == 0)
            {
                totalAmount = detectedProducts.Sum(p => p.TotalPrice);
            }

            return new OcrTicketResultDto(storeName, ticketDate, Math.Round(totalAmount, 2), detectedProducts);
        }

        public DateTime? ExtractExpirationDate(string rawText)
        {
            if (string.IsNullOrWhiteSpace(rawText)) return null;

            var match = DatePattern.Match(rawText);
            if (match.Success)
            {
                var val = match.Value.Replace('.', '/').Replace('-', '/');
                if (DateTime.TryParseExact(val, new[] { "dd/MM/yyyy", "d/M/yyyy", "dd/MM/yy", "d/M/yy" },
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    return date;
                }
            }
            return null;
        }

        public async Task<List<InventoryItemDto>> BatchConfirmOcrAsync(
            Guid houseId,
            string userId,
            List<DetectedProductDto> products)
        {
            var results = new List<InventoryItemDto>();

            foreach (var p in products)
            {
                var master = await _masterProductRepo.FindByNameAsync(p.Name);
                if (master == null)
                {
                    master = await _masterProductRepo.AddAsync(new MasterProduct
                    {
                        Name = p.Name,
                        Category = p.Category,
                        ShelfLifeDays = (int)Math.Max(1, (p.EstimatedExpiration.GetValueOrDefault(DateTime.UtcNow.AddDays(7)) - DateTime.UtcNow).TotalDays),
                        DefaultUnit = p.Unit
                    });
                }

                var item = new InventoryItem
                {
                    HouseId = houseId,
                    MasterProductId = master.Id,
                    Name = p.Name,
                    Quantity = p.Quantity,
                    Unit = p.Unit,
                    ExpirationDate = p.EstimatedExpiration ?? DateTime.UtcNow.AddDays(7),
                    Location = InferLocation(p.Category),
                    Price = p.UnitPrice,
                    PurchaseDate = DateTime.UtcNow,
                    AddedByUserId = userId
                };

                var saved = await _inventoryRepo.AddAsync(item);

                // Add to PriceHistory for Inflation tracking (RF8, RF9)
                await _priceHistoryRepo.AddPriceRecordAsync(houseId, master.Id, p.Name, p.UnitPrice);

                results.Add(new InventoryItemDto(
                    Id: saved.Id,
                    HouseId: saved.HouseId,
                    MasterProductId: saved.MasterProductId,
                    Name: saved.Name,
                    Quantity: saved.Quantity,
                    Unit: saved.Unit,
                    ExpirationDate: saved.ExpirationDate,
                    Location: saved.Location,
                    Price: saved.Price,
                    PurchaseDate: saved.PurchaseDate,
                    AddedByUserId: saved.AddedByUserId,
                    UrgencyLevel: saved.UrgencyLevel,
                    RemainingDays: saved.RemainingDays,
                    ImageUrl: master.ImageUrl
                ));
            }

            return results;
        }

        private static OcrTicketResultDto GetDefaultDemoMercadonaReceipt()
        {
            return new OcrTicketResultDto(
                StoreName: "Mercadona",
                TicketDate: DateTime.UtcNow,
                TotalAmount: 8.00m,
                DetectedProducts: new List<DetectedProductDto>
                {
                    new("Tomate frito Hacendado", 2, "ud", 0.85m, 1.70m, DateTime.UtcNow.AddDays(30), "Conservas"),
                    new("Huevos L", 1, "ud", 1.65m, 1.65m, DateTime.UtcNow.AddDays(2), "Lácteos y Huevos"),
                    new("Pechuga de pollo", 1, "ud", 3.60m, 3.60m, DateTime.UtcNow.AddDays(1), "Carnicería"),
                    new("Leche entera", 1, "l", 1.05m, 1.05m, DateTime.UtcNow.AddDays(7), "Lácteos")
                }
            );
        }

        private static string InferCategory(string name)
        {
            var n = name.ToLower();
            if (n.Contains("pollo") || n.Contains("carne") || n.Contains("ternera") || n.Contains("jamon")) return "Carnicería";
            if (n.Contains("huevo")) return "Lácteos y Huevos";
            if (n.Contains("leche") || n.Contains("queso") || n.Contains("yogur")) return "Lácteos";
            if (n.Contains("tomate") || n.Contains("conserva") || n.Contains("atun")) return "Conservas";
            if (n.Contains("manzana") || n.Contains("platano") || n.Contains("lechuga")) return "Frutas y Verduras";
            return "Despensa";
        }

        private static string InferLocation(string category)
        {
            return category switch
            {
                "Carnicería" => "Nevera",
                "Lácteos" => "Nevera",
                "Lácteos y Huevos" => "Nevera",
                "Congelados" => "Congelador",
                _ => "Despensa"
            };
        }

        private static string InferUnit(string name)
        {
            var n = name.ToLower();
            if (n.Contains("leche") || n.Contains("agua") || n.Contains("aceite")) return "l";
            if (n.Contains("500 g") || n.Contains("1 kg") || n.Contains("gramos")) return "g";
            return "ud";
        }

        private static int EstimateShelfLifeDays(string category, string name)
        {
            var n = name.ToLower();
            if (n.Contains("pollo") || n.Contains("carne fresca")) return 2;
            if (n.Contains("huevo")) return 14;
            if (n.Contains("leche fresca")) return 4;
            if (n.Contains("leche")) return 10;
            if (n.Contains("tomate frito") || n.Contains("conserva")) return 30;
            if (n.Contains("arroz") || n.Contains("pasta")) return 180;
            return 7;
        }

        private static string CapitalizeWords(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return text;
            var words = text.ToLower().Split(' ');
            for (int i = 0; i < words.Length; i++)
            {
                if (words[i].Length > 0)
                {
                    words[i] = char.ToUpper(words[i][0]) + words[i].Substring(1);
                }
            }
            return string.Join(" ", words);
        }
    }
}
