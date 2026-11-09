using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Infrastructure.Data;

namespace Kitchy.Infrastructure.Repositories
{
    public class InventoryRepository : IInventoryRepository
    {
        private readonly KitchyDbContext _context;

        public InventoryRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task<List<InventoryItem>> GetByHouseAsync(Guid houseId)
        {
            return await _context.Inventory
                .Include(i => i.MasterProduct)
                .Where(i => i.HouseId == houseId)
                .OrderBy(i => i.ExpirationDate)
                .ToListAsync();
        }

        public async Task<List<InventoryItem>> GetUrgentByHouseAsync(Guid houseId, int hoursThreshold = 48)
        {
            var maxExpiration = DateTime.UtcNow.AddHours(hoursThreshold);
            return await _context.Inventory
                .Include(i => i.MasterProduct)
                .Where(i => i.HouseId == houseId && i.ExpirationDate <= maxExpiration)
                .OrderBy(i => i.ExpirationDate)
                .ToListAsync();
        }

        public async Task<InventoryItem?> GetByIdAsync(Guid id, Guid houseId)
        {
            return await _context.Inventory
                .Include(i => i.MasterProduct)
                .FirstOrDefaultAsync(i => i.Id == id && i.HouseId == houseId);
        }

        public async Task<InventoryItem> AddAsync(InventoryItem item)
        {
            item.CreatedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;
            _context.Inventory.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<InventoryItem?> UpdateAsync(InventoryItem item)
        {
            item.UpdatedAt = DateTime.UtcNow;
            _context.Inventory.Update(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<bool> DeleteAsync(Guid id, Guid houseId)
        {
            var existing = await _context.Inventory
                .FirstOrDefaultAsync(i => i.Id == id && i.HouseId == houseId);
            if (existing == null) return false;

            _context.Inventory.Remove(existing);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<InventoryItem?> FindByNameAsync(Guid houseId, string name)
        {
            var normalized = name.Trim().ToLower();
            return await _context.Inventory
                .Include(i => i.MasterProduct)
                .FirstOrDefaultAsync(i => i.HouseId == houseId && i.Name.ToLower() == normalized);
        }
    }

    public class ShoppingListRepository : IShoppingListRepository
    {
        private readonly KitchyDbContext _context;

        public ShoppingListRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task<List<ShoppingListItem>> GetByHouseAsync(Guid houseId)
        {
            return await _context.ShoppingList
                .Include(s => s.MasterProduct)
                .Where(s => s.HouseId == houseId)
                .OrderBy(s => s.IsChecked)
                .ThenByDescending(s => s.CreatedAt)
                .ToListAsync();
        }

        public async Task<ShoppingListItem?> GetByIdAsync(Guid id, Guid houseId)
        {
            return await _context.ShoppingList
                .Include(s => s.MasterProduct)
                .FirstOrDefaultAsync(s => s.Id == id && s.HouseId == houseId);
        }

        public async Task<ShoppingListItem> AddAsync(ShoppingListItem item)
        {
            item.CreatedAt = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;
            _context.ShoppingList.Add(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<List<ShoppingListItem>> AddRangeAsync(IEnumerable<ShoppingListItem> items)
        {
            var list = items.ToList();
            var now = DateTime.UtcNow;
            foreach (var it in list)
            {
                it.CreatedAt = now;
                it.UpdatedAt = now;
            }
            _context.ShoppingList.AddRange(list);
            await _context.SaveChangesAsync();
            return list;
        }

        public async Task<ShoppingListItem?> UpdateAsync(ShoppingListItem item)
        {
            item.UpdatedAt = DateTime.UtcNow;
            _context.ShoppingList.Update(item);
            await _context.SaveChangesAsync();
            return item;
        }

        public async Task<bool> DeleteAsync(Guid id, Guid houseId)
        {
            var existing = await _context.ShoppingList
                .FirstOrDefaultAsync(s => s.Id == id && s.HouseId == houseId);
            if (existing == null) return false;

            _context.ShoppingList.Remove(existing);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ClearCheckedAsync(Guid houseId)
        {
            var checkedItems = await _context.ShoppingList
                .Where(s => s.HouseId == houseId && s.IsChecked)
                .ToListAsync();

            if (!checkedItems.Any()) return false;

            _context.ShoppingList.RemoveRange(checkedItems);
            await _context.SaveChangesAsync();
            return true;
        }
    }

    public class RecipeRepository : IRecipeRepository
    {
        private readonly KitchyDbContext _context;

        public RecipeRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task<List<Recipe>> GetAvailableRecipesAsync(Guid? houseId)
        {
            return await _context.Recipes
                .Include(r => r.Ingredients)
                .Where(r => r.HouseId == null || r.HouseId == houseId)
                .OrderBy(r => r.Title)
                .ToListAsync();
        }

        public async Task<Recipe?> GetByIdAsync(Guid id)
        {
            return await _context.Recipes
                .Include(r => r.Ingredients)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<Recipe> AddAsync(Recipe recipe)
        {
            recipe.CreatedAt = DateTime.UtcNow;
            _context.Recipes.Add(recipe);
            await _context.SaveChangesAsync();
            return recipe;
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var existing = await _context.Recipes.FindAsync(id);
            if (existing == null) return false;

            _context.Recipes.Remove(existing);
            await _context.SaveChangesAsync();
            return true;
        }
    }

    public class HouseRepository : IHouseRepository
    {
        private readonly KitchyDbContext _context;

        public HouseRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task<House?> GetByIdAsync(Guid id)
        {
            return await _context.Houses
                .Include(h => h.UserHouses)
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<House?> GetByInviteCodeAsync(string inviteCode)
        {
            var normalized = inviteCode.Trim().ToUpper();
            return await _context.Houses
                .Include(h => h.UserHouses)
                .FirstOrDefaultAsync(h => h.InviteCode.ToUpper() == normalized);
        }

        public async Task<List<House>> GetHousesForUserAsync(string userId)
        {
            return await _context.UserHouses
                .Where(uh => uh.UserId == userId)
                .Include(uh => uh.House)
                .ThenInclude(h => h!.UserHouses)
                .Select(uh => uh.House!)
                .ToListAsync();
        }

        public async Task<House> CreateHouseAsync(House house, string ownerUserId)
        {
            house.CreatedAt = DateTime.UtcNow;
            _context.Houses.Add(house);

            var link = new UserHouse
            {
                HouseId = house.Id,
                UserId = ownerUserId,
                Role = "Admin",
                JoinedAt = DateTime.UtcNow
            };
            _context.UserHouses.Add(link);

            await _context.SaveChangesAsync();
            return house;
        }

        public async Task<bool> AddUserToHouseAsync(string userId, Guid houseId, string role)
        {
            var exists = await _context.UserHouses
                .AnyAsync(uh => uh.UserId == userId && uh.HouseId == houseId);
            if (exists) return false;

            _context.UserHouses.Add(new UserHouse
            {
                UserId = userId,
                HouseId = houseId,
                Role = role,
                JoinedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> IsUserInHouseAsync(string userId, Guid houseId)
        {
            return await _context.UserHouses
                .AnyAsync(uh => uh.UserId == userId && uh.HouseId == houseId);
        }
    }

    public class MasterProductRepository : IMasterProductRepository
    {
        private readonly KitchyDbContext _context;

        public MasterProductRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task<MasterProduct?> GetByBarcodeAsync(string barcode)
        {
            return await _context.MasterProducts
                .FirstOrDefaultAsync(m => m.Barcode == barcode);
        }

        public async Task<MasterProduct?> FindByNameAsync(string name)
        {
            var normalized = name.Trim().ToLower();
            return await _context.MasterProducts
                .FirstOrDefaultAsync(m => m.Name.ToLower() == normalized);
        }

        public async Task<MasterProduct> AddAsync(MasterProduct product)
        {
            product.CreatedAt = DateTime.UtcNow;
            _context.MasterProducts.Add(product);
            await _context.SaveChangesAsync();
            return product;
        }
    }

    public class PriceHistoryRepository : IPriceHistoryRepository
    {
        private readonly KitchyDbContext _context;

        public PriceHistoryRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task AddPriceRecordAsync(Guid houseId, Guid masterProductId, string productName, decimal price)
        {
            _context.PriceHistory.Add(new PriceHistoryItem
            {
                HouseId = houseId,
                MasterProductId = masterProductId,
                ProductName = productName,
                Price = price,
                PurchaseDate = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        public async Task<List<PriceHistoryItem>> GetPriceHistoryAsync(Guid houseId, Guid masterProductId)
        {
            return await _context.PriceHistory
                .Where(p => p.HouseId == houseId && p.MasterProductId == masterProductId)
                .OrderBy(p => p.PurchaseDate)
                .ToListAsync();
        }
    }

    public class UserRepository : IUserRepository
    {
        private readonly KitchyDbContext _context;

        public UserRepository(KitchyDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByIdAsync(string id)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLower();
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        }

        public async Task<User> CreateAsync(User user)
        {
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<User> UpdateAsync(User user)
        {
            user.UpdatedAt = DateTime.UtcNow;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<bool> ExistsByEmailAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLower();
            return await _context.Users
                .AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        }
    }
}
