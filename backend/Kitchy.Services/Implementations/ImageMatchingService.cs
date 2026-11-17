using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    /// <summary>
    /// ImageMatchingService - Motor de Cascada Semántica de Alta Precisión en .NET
    /// 
    /// PASO 1: Búsqueda Exacta (Open Food Facts API + Envases de Marcas Blancas Españolas).
    /// PASO 2: Traducción Contextual (Subtipos específicos: sliced bread, vienna loaf, cured cheese).
    /// PASO 3: Diccionario Gastronómico Español (Platos preparados: Salmorejo, Gazpacho, Paella, Croquetas).
    /// </summary>
    public class ImageMatchingService : IImageMatchingService
    {
        private readonly HttpClient _httpClient;

        // Catálogo de Envases de Marcas Blancas Españolas (Open Food Facts)
        private static readonly Dictionary<string, string> OpenFoodFactsPackagingCatalog = new(StringComparer.OrdinalIgnoreCase)
        {
            { "salmorejo hacendado", "https://images.openfoodfacts.org/images/products/848/000/030/1908/front_es.18.400.jpg" },
            { "salmorejo mercadona", "https://images.openfoodfacts.org/images/products/848/000/030/1908/front_es.18.400.jpg" },
            { "gazpacho hacendado", "https://images.openfoodfacts.org/images/products/848/000/030/1915/front_es.22.400.jpg" },
            { "pan de molde hacendado", "https://images.openfoodfacts.org/images/products/848/000/009/3691/front_en.4.400.jpg" },
            { "queso curado hacendado", "https://images.openfoodfacts.org/images/products/848/000/050/6650/front_es.16.400.jpg" },
            { "queso viejo hacendado", "https://images.openfoodfacts.org/images/products/848/000/050/6650/front_es.16.400.jpg" },
            { "leche entera hacendado", "https://images.openfoodfacts.org/images/products/848/000/041/2890/front_es.28.400.jpg" },
            { "tomate frito hacendado", "https://images.openfoodfacts.org/images/products/848/000/035/0012/front_es.15.400.jpg" },
            { "huevos camperos hacendado", "https://images.openfoodfacts.org/images/products/848/000/010/0105/front_es.11.400.jpg" },
            { "coca-cola zero zero", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },
            { "coca-cola zero", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },
            { "coca cola zero", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },
            { "coca-cola", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },
            { "coca cola", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500" },
            { "pepsi", "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500" },
            { "agua fria", "https://images.unsplash.com/photo-1550505095-81378a674395?w=500" },
            { "agua fría", "https://images.unsplash.com/photo-1550505095-81378a674395?w=500" },
            { "agua frio", "https://images.unsplash.com/photo-1550505095-81378a674395?w=500" },
            { "agua mineral", "https://images.unsplash.com/photo-1550505095-81378a674395?w=500" }
        };

        // PASO 3: Diccionario Gastronómico Español (Platos preparados tradicionales)
        private static readonly List<(Regex Pattern, string Term, string Url)> SpanishGastronomyDictionary = new()
        {
            (new Regex(@"\bsalmorejo\b", RegexOptions.IgnoreCase), "salmorejo cordobés", "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500"),
            (new Regex(@"\bgazpacho\b", RegexOptions.IgnoreCase), "gazpacho andaluz", "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500"),
            (new Regex(@"\bcroqueta[s]?\b", RegexOptions.IgnoreCase), "croquetas tradicionales", "https://images.unsplash.com/photo-1562967914-608f82629710?w=500"),
            (new Regex(@"\bpaella\b", RegexOptions.IgnoreCase), "paella tradicional", "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=500"),
            (new Regex(@"\btortilla\s+(de\s+)?(patata[s]?|española|espanola)\b", RegexOptions.IgnoreCase), "tortilla de patatas", "https://images.unsplash.com/photo-1613564834361-9436948817d1?w=500"),
            (new Regex(@"\bfabada\b", RegexOptions.IgnoreCase), "fabada asturiana", "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=500"),
            (new Regex(@"\bpisto\b", RegexOptions.IgnoreCase), "pisto manchego", "https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?w=500"),
            (new Regex(@"\blentejas\b", RegexOptions.IgnoreCase), "lentejas caseras con chorizo", "https://images.unsplash.com/photo-1547592180-85f173990554?w=500"),
            (new Regex(@"\bcocido\b", RegexOptions.IgnoreCase), "cocido madrileño", "https://images.unsplash.com/photo-1547592180-85f173990554?w=500"),
            (new Regex(@"\balbondiga[s]?\b", RegexOptions.IgnoreCase), "albóndigas en salsa", "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=500"),
            (new Regex(@"\bcalamar(es)?\b", RegexOptions.IgnoreCase), "calamares a la romana", "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=500"),
            (new Regex(@"\bpulpo\b", RegexOptions.IgnoreCase), "pulpo a la gallega", "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500"),
            (new Regex(@"\bchurro[s]?\b", RegexOptions.IgnoreCase), "churros con chocolate", "https://images.unsplash.com/photo-1624371414361-e670edf4898d?w=500")
        };

        public ImageMatchingService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<ImageMatchResultDto> MatchImageAsync(string productName, string? category = null, string? barcode = null)
        {
            var raw = (productName ?? "").Trim();
            var lower = raw.ToLowerInvariant();

            // PASO 1.A: Comprobación catálogo preindexado de envases de supermercado
            foreach (var kvp in OpenFoodFactsPackagingCatalog)
            {
                if (lower.Contains(kvp.Key))
                {
                    return new ImageMatchResultDto(kvp.Value, "OpenFoodFacts", kvp.Key, null, 0.98);
                }
            }

            // PASO 1.B: Búsqueda viva en Open Food Facts
            try
            {
                var offUrl = !string.IsNullOrWhiteSpace(barcode)
                    ? $"https://world.openfoodfacts.org/api/v2/product/{Uri.EscapeDataString(barcode)}.json"
                    : $"https://es.openfoodfacts.org/cgi/search.pl?search_terms={Uri.EscapeDataString(raw)}&search_simple=1&action=process&json=1&page_size=3";

                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(2.5));
                var res = await _httpClient.GetAsync(offUrl, cts.Token);
                if (res.IsSuccessStatusCode)
                {
                    using var stream = await res.Content.ReadAsStreamAsync();
                    using var doc = await JsonDocument.ParseAsync(stream);

                    string? candidateImg = null;
                    string candidateName = raw;

                    if (!string.IsNullOrWhiteSpace(barcode) && doc.RootElement.TryGetProperty("product", out var prod))
                    {
                        candidateImg = prod.TryGetProperty("image_front_url", out var img)
                            ? img.GetString()
                            : (prod.TryGetProperty("image_url", out var img2) ? img2.GetString() : null);

                        candidateName = prod.TryGetProperty("product_name", out var pn) ? pn.GetString() ?? raw : raw;
                    }
                    else if (doc.RootElement.TryGetProperty("products", out var prods) && prods.GetArrayLength() > 0)
                    {
                        var first = prods[0];
                        candidateImg = first.TryGetProperty("image_front_url", out var img)
                            ? img.GetString()
                            : (first.TryGetProperty("image_url", out var img2) ? img2.GetString() : null);

                        candidateName = first.TryGetProperty("product_name", out var pn) ? pn.GetString() ?? raw : raw;
                    }

                    if (!string.IsNullOrWhiteSpace(candidateImg) && candidateImg.StartsWith("http"))
                    {
                        return new ImageMatchResultDto(candidateImg, "OpenFoodFacts", candidateName, null, 0.95);
                    }
                }
            }
            catch
            {
                // Fallback tolerante al siguiente paso de la cascada
            }

            return MatchImage(productName, category);
        }

        public ImageMatchResultDto MatchImage(string productName, string? category = null)
        {
            var raw = (productName ?? "").Trim();
            var lower = raw.ToLowerInvariant();

            // 1. Envases locales
            foreach (var kvp in OpenFoodFactsPackagingCatalog)
            {
                if (lower.Contains(kvp.Key))
                {
                    return new ImageMatchResultDto(kvp.Value, "OpenFoodFacts", kvp.Key, null, 0.98);
                }
            }

            // PASO 3: DICCIONARIO GASTRONÓMICO ESPAÑOL (Platos preparados autóctonos)
            foreach (var (pattern, term, url) in SpanishGastronomyDictionary)
            {
                if (pattern.IsMatch(lower))
                {
                    return new ImageMatchResultDto(url, "SpanishGastronomicDictionary", term, null, 0.96);
                }
            }

            // PASO 2: TRADUCCIÓN CONTEXTUAL POR SUBTIPO (Granularidad y Cero Falsos Positivos)
            // Queso curado / viejo / manchego -> cured cheese wedge (NUNCA huevos)
            if (lower.Contains("queso") && (lower.Contains("curado") || lower.Contains("viejo") || lower.Contains("manchego") || lower.Contains("semi") || lower.Contains("añejo")))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=500",
                    "ContextualTranslation",
                    "queso curado",
                    "cured cheese wedge with rind",
                    0.95
                );
            }

            // Queso fresco
            if (lower.Contains("queso") && (lower.Contains("fresco") || lower.Contains("burgos") || lower.Contains("blanco")) || lower.Contains("mozzarella"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1559561853-08451507cbe7?w=500",
                    "ContextualTranslation",
                    "queso fresco",
                    "fresh white cheese",
                    0.95
                );
            }

            // Queso en general
            if (lower.Contains("queso") || lower.Contains("formatge"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=500",
                    "ContextualTranslation",
                    "queso artesanal",
                    "cheese wedge",
                    0.90
                );
            }

            // Pan de molde -> sliced bread
            if (lower.Contains("molde"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=500",
                    "ContextualTranslation",
                    "pan de molde",
                    "sliced sandwich bread loaf",
                    0.95
                );
            }

            // Pan de Viena -> vienna loaf
            if (lower.Contains("viena") || lower.Contains("panecillo") || lower.Contains("bocadillo"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=500",
                    "ContextualTranslation",
                    "pan de viena",
                    "vienna loaf rolls",
                    0.95
                );
            }

            // Barra de pan artesanal / baguette
            if (lower.Contains("barra") || lower.Contains("baguette") || lower.Contains("hogaza") || lower.Contains("chapata"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
                    "ContextualTranslation",
                    "barra de pan artesanal",
                    "french baguette rustic loaf",
                    0.90
                );
            }

            // Pan tostado / picos
            if (lower.Contains("tostad") || lower.Contains("biscote") || lower.Contains("pico") || lower.Contains("regga"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500",
                    "ContextualTranslation",
                    "pan tostado y picos",
                    "toasted crispy bread",
                    0.90
                );
            }

            // Pan genérico
            if (lower.Contains("pan"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500",
                    "ContextualTranslation",
                    "pan artesanal",
                    "artisan bread",
                    0.85
                );
            }

            // Huevos (estrictamente huevos)
            if (lower.Contains("huevo") || Regex.IsMatch(lower, @"\bou[s]?\b") || lower.Contains("huevina"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500",
                    "ContextualTranslation",
                    "huevos de gallina",
                    "fresh chicken eggs in carton",
                    0.95
                );
            }

            // Leche
            if (lower.Contains("leche") || lower.Contains("llet"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500",
                    "ContextualTranslation",
                    "leche entera",
                    "whole milk bottle",
                    0.90
                );
            }

            // Agua mineral / Agua fría
            if (lower.Contains("agua") || lower.Contains("aigua") || lower.Contains("fria") || lower.Contains("fría") || lower.Contains("frio"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1550505095-81378a674395?w=500",
                    "ContextualTranslation",
                    "agua mineral fresca",
                    "mineral water bottle cold droplets",
                    0.96
                );
            }

            // Coca Cola
            if (lower.Contains("coca") || lower.Contains("cola") || lower.StartsWith("cc ") || lower == "cc")
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500",
                    "ContextualTranslation",
                    "coca cola",
                    "coca cola can",
                    0.95
                );
            }

            // Pepsi
            if (lower.Contains("pepsi"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=500",
                    "ContextualTranslation",
                    "pepsi",
                    "pepsi cola can",
                    0.95
                );
            }

            // Cerveza
            if (lower.Contains("cerveza") || lower.Contains("cerv") || lower.Contains("mahou") || lower.Contains("estrella") || lower.Contains("heineken") || lower.Contains("beer"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1608270199042-3a832e8d975a?w=500",
                    "ContextualTranslation",
                    "cerveza fría",
                    "cold beer can or bottle",
                    0.95
                );
            }

            // Zumo / Néctar
            if (lower.Contains("zumo") || lower.Contains("nectar") || lower.Contains("néctar") || lower.Contains("juice"))
            {
                return new ImageMatchResultDto(
                    "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=500",
                    "ContextualTranslation",
                    "zumo de frutas",
                    "fresh fruit juice bottle",
                    0.92
                );
            }

            // Fallback por Categoría
            var fallback = category switch
            {
                "Carne" => "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=500",
                "Pescado" => "https://images.unsplash.com/photo-1534482421-64566f976cfa?w=500",
                "Lácteos y Huevos" => "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500", // Leche, no huevos!
                "Frutas y Verduras" => "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500",
                "Bebidas" => "https://images.unsplash.com/photo-1550505095-81378a674395?w=500",
                _ => "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500"
            };

            return new ImageMatchResultDto(fallback, "CategoryFallback", category ?? "General", null, 0.70);
        }
    }
}
