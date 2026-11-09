using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Kitchy.Core.Enums;

namespace Kitchy.Core.Models
{
    [Table("users")]
    public class User
    {
        [Key]
        [MaxLength(100)]
        [Column("id")]
        public string Id { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("email")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("password_hash")]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("full_name")]
        public string FullName { get; set; } = string.Empty;

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("houses")]
    public class House
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(255)]
        [Column("address")]
        public string? Address { get; set; }

        [Column("latitude")]
        public double? Latitude { get; set; }

        [Column("longitude")]
        public double? Longitude { get; set; }

        [MaxLength(50)]
        [Column("invite_code")]
        public string InviteCode { get; set; } = Guid.NewGuid().ToString("N")[..8];

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<UserHouse> UserHouses { get; set; } = new List<UserHouse>();
        public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
        public ICollection<ShoppingListItem> ShoppingListItems { get; set; } = new List<ShoppingListItem>();
        public ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();
    }

    [Table("user_houses")]
    public class UserHouse
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [Column("house_id")]
        public Guid HouseId { get; set; }

        [ForeignKey(nameof(HouseId))]
        public House? House { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("role")]
        public string Role { get; set; } = HouseholdRole.Member.ToString();

        [Column("joined_at")]
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("master_products")]
    public class MasterProduct
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(150)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        [Column("barcode")]
        public string? Barcode { get; set; }

        [MaxLength(100)]
        [Column("category")]
        public string Category { get; set; } = "General";

        [Column("shelf_life_days")]
        public int ShelfLifeDays { get; set; } = 7;

        [MaxLength(20)]
        [Column("default_unit")]
        public string DefaultUnit { get; set; } = "ud";

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("inventory")]
    public class InventoryItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("house_id")]
        public Guid HouseId { get; set; }

        [ForeignKey(nameof(HouseId))]
        public House? House { get; set; }

        [Column("master_product_id")]
        public Guid? MasterProductId { get; set; }

        [ForeignKey(nameof(MasterProductId))]
        public MasterProduct? MasterProduct { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("quantity", TypeName = "numeric(10,2)")]
        public decimal Quantity { get; set; } = 1;

        [MaxLength(20)]
        [Column("unit")]
        public string Unit { get; set; } = "ud";

        [Column("expiration_date")]
        public DateTime ExpirationDate { get; set; }

        [MaxLength(100)]
        [Column("location")]
        public string Location { get; set; } = "Nevera";

        [Column("price", TypeName = "numeric(10,2)")]
        public decimal Price { get; set; } = 0.00m;

        [Column("purchase_date")]
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(100)]
        [Column("added_by_user_id")]
        public string AddedByUserId { get; set; } = string.Empty;

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public ItemUrgency UrgencyLevel
        {
            get
            {
                var remaining = ExpirationDate - DateTime.UtcNow;
                if (remaining.TotalHours <= 24) return ItemUrgency.Red;
                if (remaining.TotalHours <= 48) return ItemUrgency.Amber;
                return ItemUrgency.Green;
            }
        }

        [NotMapped]
        public int RemainingDays => (int)Math.Ceiling((ExpirationDate - DateTime.UtcNow).TotalDays);
    }

    [Table("shopping_list")]
    public class ShoppingListItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("house_id")]
        public Guid HouseId { get; set; }

        [ForeignKey(nameof(HouseId))]
        public House? House { get; set; }

        [Column("master_product_id")]
        public Guid? MasterProductId { get; set; }

        [ForeignKey(nameof(MasterProductId))]
        public MasterProduct? MasterProduct { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("quantity", TypeName = "numeric(10,2)")]
        public decimal Quantity { get; set; } = 1;

        [MaxLength(20)]
        [Column("unit")]
        public string Unit { get; set; } = "ud";

        [Column("is_checked")]
        public bool IsChecked { get; set; } = false;

        [MaxLength(50)]
        [Column("source")]
        public string Source { get; set; } = ItemSource.Manual.ToString();

        [Required]
        [MaxLength(100)]
        [Column("added_by_user_id")]
        public string AddedByUserId { get; set; } = string.Empty;

        [MaxLength(100)]
        [Column("assigned_to_user_id")]
        public string? AssignedToUserId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("recipes")]
    public class Recipe
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("house_id")]
        public Guid? HouseId { get; set; }

        [ForeignKey(nameof(HouseId))]
        public House? House { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Required]
        [Column("instructions_json")]
        public string InstructionsJson { get; set; } = "[]";

        [Column("servings")]
        public int Servings { get; set; } = 2;

        [Column("prep_time_minutes")]
        public int PrepTimeMinutes { get; set; } = 20;

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [MaxLength(50)]
        [Column("source")]
        public string Source { get; set; } = "KitchySystem";

        [MaxLength(100)]
        [Column("created_by_user_id")]
        public string? CreatedByUserId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<RecipeIngredient> Ingredients { get; set; } = new List<RecipeIngredient>();
    }

    [Table("recipe_ingredients")]
    public class RecipeIngredient
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("recipe_id")]
        public Guid RecipeId { get; set; }

        [ForeignKey(nameof(RecipeId))]
        public Recipe? Recipe { get; set; }

        [Column("master_product_id")]
        public Guid? MasterProductId { get; set; }

        [ForeignKey(nameof(MasterProductId))]
        public MasterProduct? MasterProduct { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("quantity", TypeName = "numeric(10,2)")]
        public decimal Quantity { get; set; } = 1;

        [MaxLength(20)]
        [Column("unit")]
        public string Unit { get; set; } = "g";
    }

    [Table("price_history")]
    public class PriceHistoryItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("house_id")]
        public Guid HouseId { get; set; }

        [ForeignKey(nameof(HouseId))]
        public House? House { get; set; }

        [Required]
        [Column("master_product_id")]
        public Guid MasterProductId { get; set; }

        [ForeignKey(nameof(MasterProductId))]
        public MasterProduct? MasterProduct { get; set; }

        [Required]
        [MaxLength(150)]
        [Column("product_name")]
        public string ProductName { get; set; } = string.Empty;

        [Column("price", TypeName = "numeric(10,2)")]
        public decimal Price { get; set; }

        [Column("purchase_date")]
        public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    }
}

