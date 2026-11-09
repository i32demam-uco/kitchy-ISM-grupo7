using System;
using System.Linq;
using Moq;
using Xunit;
using Kitchy.Core.Interfaces;
using Kitchy.Services.Implementations;

namespace Kitchy.Tests
{
    public class OcrTests
    {
        private readonly OcrService _ocrService;

        public OcrTests()
        {
            var mockInv = new Mock<IInventoryRepository>();
            var mockMaster = new Mock<IMasterProductRepository>();
            var mockPrice = new Mock<IPriceHistoryRepository>();

            _ocrService = new OcrService(mockInv.Object, mockMaster.Object, mockPrice.Object);
        }

        [Fact]
        public void ParseReceiptText_WithMercadonaReceipt_ExtractsAllItemsAndPrices()
        {
            // Text matching the Mercadona receipt in the Figma design (Screen 2)
            var rawReceipt = @"
                MERCADONA, S.A.  A-46103834
                C/ Gran Vía Parque, 18 - Córdoba
                2 x TOMATE FRITO HACENDADO 1,70 €
                1 x HUEVOS L 1,65 €
                1 x PECHUGA POLLO 500 G 3,60 €
                1 x LECHE ENTERA 1 L 1,05 €
                TOTAL 8,00 €
            ";

            var result = _ocrService.ParseReceiptText(rawReceipt);

            Assert.NotNull(result);
            Assert.Equal("Mercadona", result.StoreName);
            Assert.Equal(8.00m, result.TotalAmount);
            Assert.Equal(4, result.DetectedProducts.Count);

            var tomate = result.DetectedProducts.FirstOrDefault(p => p.Name.Contains("Tomate", StringComparison.OrdinalIgnoreCase));
            Assert.NotNull(tomate);
            Assert.Equal(2, tomate.Quantity);
            Assert.Equal(1.70m, tomate.TotalPrice);

            var huevos = result.DetectedProducts.FirstOrDefault(p => p.Name.Contains("Huevos", StringComparison.OrdinalIgnoreCase));
            Assert.NotNull(huevos);
            Assert.Equal(1.65m, tomate != null ? huevos.TotalPrice : 0);

            var pollo = result.DetectedProducts.FirstOrDefault(p => p.Name.Contains("Pollo", StringComparison.OrdinalIgnoreCase));
            Assert.NotNull(pollo);
            Assert.Equal(3.60m, pollo.TotalPrice);
            Assert.Equal("Carnicería", pollo.Category);
        }

        [Fact]
        public void ExtractExpirationDate_WithMultipleFormats_ParsesCorrectly()
        {
            var text1 = "Consumir preferentemente antes de: 24/11/2026";
            var date1 = _ocrService.ExtractExpirationDate(text1);
            Assert.NotNull(date1);
            Assert.Equal(2026, date1.Value.Year);
            Assert.Equal(11, date1.Value.Month);
            Assert.Equal(24, date1.Value.Day);

            var text2 = "CAD: 15-08-2027";
            var date2 = _ocrService.ExtractExpirationDate(text2);
            Assert.NotNull(date2);
            Assert.Equal(2027, date2.Value.Year);
            Assert.Equal(8, date2.Value.Month);
            Assert.Equal(15, date2.Value.Day);
        }
    }
}

