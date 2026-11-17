using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Core.Security;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class ShoppingListService : IShoppingListService
    {
        private readonly IShoppingListRepository _shoppingListRepo;
        private readonly IHouseRepository? _houseRepo;
        private readonly IInventoryRepository? _inventoryRepo;
        private readonly IHouseCollaborationNotifier? _notifier;
        private readonly IHouseMessageRepository? _messageRepo;
        private readonly IUserRepository? _userRepo;

        // Regex para eliminar cantidades y unidades de medida (ej. 1 L, 500 g, 2x, 1kg)
        private static readonly Regex UnitPattern = new(
            @"\b(\d+([.,]\d+)?)\s*(l|ml|g|kg|ud|unidades|latas|paquete|pack|brik)\b",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        // Regex para marcas blancas comunes
        private static readonly Regex BrandPattern = new(
            @"\b(hacendado|mercadona|carrefour|dia|lidl|eroski|alcampo|aldi|nestle|pascual|danone)\b",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        // Palabras conectoras / secundarias a filtrar
        private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
        {
            "de", "con", "en", "y", "el", "la", "los", "las", "un", "una", "unos", "unas",
            "entera", "desnatada", "semidesnatada", "fresco", "fresca", "frescos", "frescas",
            "para", "del", "al"
        };

        public ShoppingListService(
            IShoppingListRepository shoppingListRepo,
            IHouseRepository? houseRepo = null,
            IInventoryRepository? inventoryRepo = null,
            IHouseCollaborationNotifier? notifier = null,
            IHouseMessageRepository? messageRepo = null,
            IUserRepository? userRepo = null)
        {
            _shoppingListRepo = shoppingListRepo;
            _houseRepo = houseRepo;
            _inventoryRepo = inventoryRepo;
            _notifier = notifier;
            _messageRepo = messageRepo;
            _userRepo = userRepo;
        }

        public async Task<List<ShoppingListItemDto>> GetShoppingListAsync(Guid houseId)
        {
            var items = await _shoppingListRepo.GetByHouseAsync(houseId);
            return items.Select(MapToDto).ToList();
        }

        public async Task<ShoppingListItemDto> AddItemAsync(Guid houseId, string userId, CreateShoppingItemDto dto)
        {
            var item = new ShoppingListItem
            {
                HouseId = houseId,
                MasterProductId = dto.MasterProductId,
                Name = InputSanitizer.Sanitize(dto.Name),
                Quantity = dto.Quantity,
                Unit = InputSanitizer.Sanitize(dto.Unit),
                Source = dto.Source,
                IsChecked = false,
                AddedByUserId = userId
            };

            var added = await _shoppingListRepo.AddAsync(item);

            // Evaluar urgencia automática tras añadir nuevo producto
            await EvaluateAutomaticUrgencyAsync(houseId);

            return MapToDto(added);
        }

        public async Task<ShoppingListItemDto?> UpdateItemAsync(Guid houseId, Guid itemId, UpdateShoppingItemDto dto)
        {
            var existing = await _shoppingListRepo.GetByIdAsync(itemId, houseId);
            if (existing == null) return null;

            if (dto.Name != null) existing.Name = dto.Name;
            if (dto.Quantity.HasValue) existing.Quantity = dto.Quantity.Value;
            if (dto.Unit != null) existing.Unit = dto.Unit;
            if (dto.IsChecked.HasValue) existing.IsChecked = dto.IsChecked.Value;
            if (dto.AssignedToUserId != null) existing.AssignedToUserId = dto.AssignedToUserId;

            var updated = await _shoppingListRepo.UpdateAsync(existing);

            // Reevaluar urgencia al marcar o desmarcar
            await EvaluateAutomaticUrgencyAsync(houseId);

            return updated != null ? MapToDto(updated) : null;
        }

        public async Task<bool> DeleteItemAsync(Guid houseId, Guid itemId)
        {
            var deleted = await _shoppingListRepo.DeleteAsync(itemId, houseId);
            if (deleted)
            {
                await EvaluateAutomaticUrgencyAsync(houseId);
            }
            return deleted;
        }

        public async Task<bool> ClearCheckedAsync(Guid houseId)
        {
            var cleared = await _shoppingListRepo.ClearCheckedAsync(houseId);
            if (cleared)
            {
                await EvaluateAutomaticUrgencyAsync(houseId);
            }
            return cleared;
        }

        public async Task<ShoppingListUrgencyStatusDto> GetUrgencyStatusAsync(Guid houseId)
        {
            var house = _houseRepo != null ? await _houseRepo.GetByIdAsync(houseId) : null;
            var items = await _shoppingListRepo.GetByHouseAsync(houseId);
            var pendingCount = items.Count(i => !i.IsChecked);

            return new ShoppingListUrgencyStatusDto(
                IsUrgent: house?.IsUrgent ?? (pendingCount >= 5),
                UrgentModeSource: house?.UrgentModeSource ?? (pendingCount >= 5 ? "AUTO_LOW_STOCK" : "NONE"),
                UrgentUpdatedAt: house?.UrgentUpdatedAt,
                PendingCount: pendingCount
            );
        }

        public async Task<ShoppingListUrgencyStatusDto> SetUrgencyStatusAsync(Guid houseId, bool isUrgent, string source = "MANUAL")
        {
            var house = _houseRepo != null ? await _houseRepo.GetByIdAsync(houseId) : null;
            var items = await _shoppingListRepo.GetByHouseAsync(houseId);
            var pendingCount = items.Count(i => !i.IsChecked);

            if (house != null)
            {
                house.IsUrgent = isUrgent;
                house.UrgentModeSource = isUrgent ? source : "NONE";
                house.UrgentUpdatedAt = DateTime.UtcNow;
                await _houseRepo!.UpdateHouseAsync(house);
            }

            var status = new ShoppingListUrgencyStatusDto(
                IsUrgent: isUrgent,
                UrgentModeSource: isUrgent ? source : "NONE",
                UrgentUpdatedAt: DateTime.UtcNow,
                PendingCount: pendingCount
            );

            if (_notifier != null)
            {
                await _notifier.BroadcastShoppingListUrgencyChangedAsync(houseId, status);
            }

            return status;
        }

        public async Task<ShoppingListUrgencyStatusDto> EvaluateAutomaticUrgencyAsync(Guid houseId)
        {
            var house = _houseRepo != null ? await _houseRepo.GetByIdAsync(houseId) : null;
            var items = await _shoppingListRepo.GetByHouseAsync(houseId);
            var pendingCount = items.Count(i => !i.IsChecked);

            var urgentInventory = _inventoryRepo != null
                ? await _inventoryRepo.GetUrgentByHouseAsync(houseId, 24)
                : new List<InventoryItem>();

            var shouldBeUrgent = pendingCount >= 5 || urgentInventory.Count > 0;

            if (house != null)
            {
                // Solo alterar si no está en modo MANUAL o si se alcanza el umbral crítico
                if (shouldBeUrgent && !house.IsUrgent)
                {
                    house.IsUrgent = true;
                    house.UrgentModeSource = "AUTO_LOW_STOCK";
                    house.UrgentUpdatedAt = DateTime.UtcNow;
                    await _houseRepo!.UpdateHouseAsync(house);

                    var status = new ShoppingListUrgencyStatusDto(true, "AUTO_LOW_STOCK", house.UrgentUpdatedAt, pendingCount);
                    if (_notifier != null)
                    {
                        await _notifier.BroadcastShoppingListUrgencyChangedAsync(houseId, status);
                    }
                    return status;
                }
                else if (!shouldBeUrgent && house.IsUrgent && house.UrgentModeSource == "AUTO_LOW_STOCK")
                {
                    house.IsUrgent = false;
                    house.UrgentModeSource = "NONE";
                    house.UrgentUpdatedAt = DateTime.UtcNow;
                    await _houseRepo!.UpdateHouseAsync(house);

                    var status = new ShoppingListUrgencyStatusDto(false, "NONE", house.UrgentUpdatedAt, pendingCount);
                    if (_notifier != null)
                    {
                        await _notifier.BroadcastShoppingListUrgencyChangedAsync(houseId, status);
                    }
                    return status;
                }
            }

            return new ShoppingListUrgencyStatusDto(
                IsUrgent: house?.IsUrgent ?? shouldBeUrgent,
                UrgentModeSource: house?.UrgentModeSource ?? (shouldBeUrgent ? "AUTO_LOW_STOCK" : "NONE"),
                UrgentUpdatedAt: house?.UrgentUpdatedAt,
                PendingCount: pendingCount
            );
        }

        public async Task<ReconciliationResultDto> ReconcileWithScannedProductsAsync(
            Guid houseId,
            string userId,
            List<DetectedProductDto> scannedProducts)
        {
            var items = await _shoppingListRepo.GetByHouseAsync(houseId);
            var pendingItems = items.Where(i => !i.IsChecked).ToList();

            var reconciledNames = new List<string>();

            foreach (var scanned in scannedProducts)
            {
                var matched = pendingItems.FirstOrDefault(p => IsFuzzyMatch(scanned.Name, p.Name));
                if (matched != null)
                {
                    // Eliminar o marcar como completado en la lista de la compra
                    await _shoppingListRepo.DeleteAsync(matched.Id, houseId);
                    reconciledNames.Add(matched.Name);
                    pendingItems.Remove(matched);
                }
            }

            var remainingItems = await _shoppingListRepo.GetByHouseAsync(houseId);
            var remainingCount = remainingItems.Count(i => !i.IsChecked);

            var house = _houseRepo != null ? await _houseRepo.GetByIdAsync(houseId) : null;
            var wasUrgent = house?.IsUrgent ?? false;

            // Desactivación automática del modo urgente si la lista queda vacía o baja de 5 sin productos urgentes
            var urgentInventory = _inventoryRepo != null
                ? await _inventoryRepo.GetUrgentByHouseAsync(houseId, 24)
                : new List<InventoryItem>();

            var nowUrgent = remainingCount >= 5 || urgentInventory.Count > 0;
            if (house != null && (remainingCount == 0 || !nowUrgent))
            {
                house.IsUrgent = false;
                house.UrgentModeSource = "NONE";
                house.UrgentUpdatedAt = DateTime.UtcNow;
                await _houseRepo!.UpdateHouseAsync(house);
                nowUrgent = false;

                // Si era urgente y se completó, emitir SYSTEM_ACTION en el chat
                if (wasUrgent && _messageRepo != null)
                {
                    var user = _userRepo != null ? await _userRepo.GetByIdAsync(userId) : null;
                    var userName = user?.FullName ?? (userId == "aleja" ? "Alejandro" : userId);
                    var content = $"{userName} ha completado la compra urgente ({reconciledNames.Count} productos tachados de la lista)";

                    await _messageRepo.AddMessageAsync(new HouseMessage
                    {
                        HouseId = houseId,
                        SenderId = userId,
                        MessageType = "SYSTEM_ACTION",
                        Content = content,
                        ActionMetadataJson = System.Text.Json.JsonSerializer.Serialize(new
                        {
                            ActionType = "SCANNED_TICKET",
                            PerformedBy = userId,
                            PerformedByName = userName,
                            TotalAdded = reconciledNames.Count,
                            StoreName = "Supermercado"
                        }),
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            var result = new ReconciliationResultDto(
                ReconciledCount: reconciledNames.Count,
                ReconciledItemNames: reconciledNames,
                IsUrgent: nowUrgent,
                RemainingCount: remainingCount
            );

            if (_notifier != null)
            {
                await _notifier.BroadcastShoppingListReconciledAsync(houseId, result);
                await _notifier.BroadcastShoppingListUrgencyChangedAsync(houseId, new ShoppingListUrgencyStatusDto(
                    IsUrgent: nowUrgent,
                    UrgentModeSource: nowUrgent ? "AUTO_LOW_STOCK" : "NONE",
                    UrgentUpdatedAt: DateTime.UtcNow,
                    PendingCount: remainingCount
                ));
            }

            return result;
        }

        public static bool IsFuzzyMatch(string ticketText, string shoppingItemText)
        {
            var normTicket = NormalizeForComparison(ticketText);
            var normItem = NormalizeForComparison(shoppingItemText);

            if (string.IsNullOrWhiteSpace(normTicket) || string.IsNullOrWhiteSpace(normItem))
            {
                return false;
            }

            // Coincidencia exacta o contención directa
            if (normTicket == normItem || normTicket.Contains(normItem) || normItem.Contains(normTicket))
            {
                return true;
            }

            var tokensTicket = ExtractSignificantTokens(normTicket);
            var tokensItem = ExtractSignificantTokens(normItem);

            // Si comparten cualquier raíz semántica significativa (ej. "pollo", "leche", "tomate")
            return tokensTicket.Intersect(tokensItem).Any();
        }

        private static string NormalizeForComparison(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;

            var text = input.Trim().ToLowerInvariant();

            // Quitar tildes
            text = RemoveDiacritics(text);

            // Quitar unidades y cantidades (1 L, 500 g, 2 ud, 1kg)
            text = UnitPattern.Replace(text, " ");

            // Quitar marcas blancas (hacendado, carrefour, etc.)
            text = BrandPattern.Replace(text, " ");

            // Quitar números aislados y puntuación
            text = Regex.Replace(text, @"[\d+.,\-_/\\()&%$#@!]", " ");

            return Regex.Replace(text, @"\s+", " ").Trim();
        }

        private static HashSet<string> ExtractSignificantTokens(string normalized)
        {
            var tokens = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var words = normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            foreach (var w in words)
            {
                if (w.Length >= 3 && !StopWords.Contains(w))
                {
                    tokens.Add(w);
                }
            }
            return tokens;
        }

        private static string RemoveDiacritics(string text)
        {
            var normalizedString = text.Normalize(NormalizationForm.FormD);
            var stringBuilder = new StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            return stringBuilder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static ShoppingListItemDto MapToDto(ShoppingListItem s)
        {
            return new ShoppingListItemDto(
                Id: s.Id,
                HouseId: s.HouseId,
                MasterProductId: s.MasterProductId,
                Name: s.Name,
                Quantity: s.Quantity,
                Unit: s.Unit,
                IsChecked: s.IsChecked,
                Source: s.Source,
                AddedByUserId: s.AddedByUserId,
                AssignedToUserId: s.AssignedToUserId,
                CreatedAt: s.CreatedAt,
                ImageUrl: s.MasterProduct?.ImageUrl
            );
        }
    }
}
