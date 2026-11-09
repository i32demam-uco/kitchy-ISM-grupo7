using System;
using System.Text.RegularExpressions;

namespace Kitchy.Core.Security
{
    public static class InputSanitizer
    {
        // Remove dangerous script, iframe, javascript: tags
        private static readonly Regex XssPattern = new(
            @"<[^>]*script.*?>.*?<.*?/.*?script.*?>|<[^>]*style.*?>.*?<.*?/.*?style.*?>|<[^>]+>|javascript:|onload=|onerror=",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        // Detect dangerous SQL injection attempts
        private static readonly Regex SqlInjectionPattern = new(
            @"(--|/\*|\*/|;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE)\b|'\s*OR\s*['\d]+=['\d]+|""\s*OR\s*[""\d]+=[\d""]+|\bUNION\s+ALL\s+SELECT\b|\bUNION\s+SELECT\b)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static string Sanitize(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;

            // 1. Remove dangerous markup, script blocks and event handlers
            var cleaned = XssPattern.Replace(input, string.Empty);

            // 2. Escape only dangerous HTML delimiters while preserving unicode (accents, ñ)
            cleaned = cleaned.Trim()
                .Replace("<", "&lt;")
                .Replace(">", "&gt;")
                .Replace("\"", "&quot;")
                .Replace("'", "&#x27;");

            return cleaned;
        }

        public static bool ContainsMaliciousPatterns(string? input)
        {
            if (string.IsNullOrEmpty(input)) return false;
            return XssPattern.IsMatch(input)
                   || input.Contains("<script", StringComparison.OrdinalIgnoreCase)
                   || input.Contains("javascript:", StringComparison.OrdinalIgnoreCase)
                   || input.Contains("onerror=", StringComparison.OrdinalIgnoreCase)
                   || input.Contains("onload=", StringComparison.OrdinalIgnoreCase)
                   || ContainsSqlInjection(input);
        }

        public static bool ContainsSqlInjection(string? input)
        {
            if (string.IsNullOrEmpty(input)) return false;
            return SqlInjectionPattern.IsMatch(input);
        }
    }
}
