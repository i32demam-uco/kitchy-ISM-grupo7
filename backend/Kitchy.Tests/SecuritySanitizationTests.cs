using System;
using Xunit;
using Kitchy.Core.Security;

namespace Kitchy.Tests
{
    public class SecuritySanitizationTests
    {
        [Theory]
        [InlineData("<script>alert('pwned')</script>Leche entera", "Leche entera")]
        [InlineData("<img src=x onerror=alert(1)>Huevos L", "Huevos L")]
        [InlineData("javascript:evil();Pechuga de pollo", "Pechuga de pollo")]
        [InlineData("<style>body{display:none}</style>Pan", "Pan")]
        public void Sanitize_StripsDangerousXssPayloads(string maliciousInput, string expectedClean)
        {
            var sanitized = InputSanitizer.Sanitize(maliciousInput);
            Assert.DoesNotContain("<script", sanitized, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("onerror=", sanitized, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("javascript:", sanitized, StringComparison.OrdinalIgnoreCase);
            Assert.Contains(expectedClean, sanitized);
        }

        [Fact]
        public void Sanitize_PreservesValidSpanishCharactersAndAccents()
        {
            var normalProduct = "Jamón Serrano & Tomate Frito";
            var sanitized = InputSanitizer.Sanitize(normalProduct);

            Assert.Contains("Jamón Serrano", sanitized);
            Assert.Contains("Tomate Frito", sanitized);
        }

        [Theory]
        [InlineData("<script>stealCookies()</script>", true)]
        [InlineData("javascript:doEvil()", true)]
        [InlineData("'; DROP TABLE inventory; --", true)]
        [InlineData("' OR '1'='1", true)]
        [InlineData("UNION SELECT * FROM user_houses", true)]
        [InlineData("Pechuga de pollo 500g", false)]
        [InlineData("Huevos frescos L", false)]
        public void ContainsMaliciousPatterns_DetectsThreatsCorrectly(string input, bool expectedThreat)
        {
            var detected = InputSanitizer.ContainsMaliciousPatterns(input);
            Assert.Equal(expectedThreat, detected);
        }

        [Theory]
        [InlineData("'; DROP TABLE inventory; --", true)]
        [InlineData("' OR '1'='1", true)]
        [InlineData("1; DELETE FROM houses WHERE id='abc'", true)]
        [InlineData("Tomate frito Hacendado", false)]
        [InlineData("Leche desnatada 1L", false)]
        public void ContainsSqlInjection_DetectsSqlInjectionAttempts(string input, bool expectedThreat)
        {
            var detected = InputSanitizer.ContainsSqlInjection(input);
            Assert.Equal(expectedThreat, detected);
        }
    }
}
