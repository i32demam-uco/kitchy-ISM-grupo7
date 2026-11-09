using Microsoft.EntityFrameworkCore;
using Kitchy.Core.Models;

namespace Kitchy.Infrastructure.Data
{
    public class KitchyDbContext : DbContext
    {
        public KitchyDbContext(DbContextOptions<KitchyDbContext> options) : base(options)
        {
        }

        public DbSet<House> Houses => Set<House>();
        public DbSet<UserHouse> UserHouses => Set<UserHouse>();
        public DbSet<User> Users => Set<User>();
        public DbSet<MasterProduct> MasterProducts => Set<MasterProduct>();
        public DbSet<InventoryItem> Inventory => Set<InventoryItem>();
        public DbSet<ShoppingListItem> ShoppingList => Set<ShoppingListItem>();
        public DbSet<Recipe> Recipes => Set<Recipe>();
        public DbSet<RecipeIngredient> RecipeIngredients => Set<RecipeIngredient>();
        public DbSet<PriceHistoryItem> PriceHistory => Set<PriceHistoryItem>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User unique email index
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // UserHouse unique constraint
            modelBuilder.Entity<UserHouse>()
                .HasIndex(uh => new { uh.UserId, uh.HouseId })
                .IsUnique();

            // Inventory indexes
            modelBuilder.Entity<InventoryItem>()
                .HasIndex(i => i.HouseId);
            modelBuilder.Entity<InventoryItem>()
                .HasIndex(i => i.ExpirationDate);

            // Shopping list indexes
            modelBuilder.Entity<ShoppingListItem>()
                .HasIndex(s => s.HouseId);

            // MasterProduct barcode unique index
            modelBuilder.Entity<MasterProduct>()
                .HasIndex(p => p.Barcode)
                .IsUnique();

            // Recipe relationships
            modelBuilder.Entity<Recipe>()
                .HasMany(r => r.Ingredients)
                .WithOne(i => i.Recipe)
                .HasForeignKey(i => i.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}

