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

        [Column("is_urgent")]
        public bool IsUrgent { get; set; } = false;

        [MaxLength(50)]
        [Column("urgent_mode_source")]
        public string UrgentModeSource { get; set; } = "NONE"; // NONE, MANUAL, AUTO_LOW_STOCK

        [Column("urgent_updated_at")]
        public DateTime? UrgentUpdatedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<UserHouse> UserHouses { get; set; } = new List<UserHouse>();
        public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
        public ICollection<ShoppingListItem> ShoppingListItems { get; set; } = new List<ShoppingListItem>();
        public ICollection<Recipe> Recipes { get; set; } = new List<Recipe>();
        public ICollection<HouseMessage> HouseMessages { get; set; } = new List<HouseMessage>();
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

        [MaxLength(100)]
        [Column("created_by")]
        public string? CreatedBy { get; set; }

        [Required]
        [MaxLength(200)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [MaxLength(255)]
        [Column("subtitle")]
        public string? Subtitle { get; set; }

        [Column("description")]
        public string? Description { get; set; }

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("servings")]
        public int Servings { get; set; } = 2;

        [Column("total_time_minutes")]
        public int TotalTimeMinutes { get; set; } = 20;

        [MaxLength(50)]
        [Column("difficulty")]
        public string Difficulty { get; set; } = "Media";

        [Column("calories_kcal")]
        public int CaloriesKcal { get; set; } = 450;

        [Column("pantry_match_percentage")]
        public int PantryMatchPercentage { get; set; } = 100;

        [MaxLength(50)]
        [Column("source_type")]
        public string SourceType { get; set; } = "AI_GENERATED";

        [Column("ingredients")]
        public string IngredientsJson { get; set; } = "[]";

        [Column("steps")]
        public string StepsJson { get; set; } = "[]";

        [Column("instructions_json")]
        public string InstructionsJson { get; set; } = "[]";

        [Column("prep_time_minutes")]
        public int PrepTimeMinutes { get; set; } = 20;

        [MaxLength(50)]
        [Column("source")]
        public string Source { get; set; } = "KitchySystem";

        [MaxLength(100)]
        [Column("created_by_user_id")]
        public string? CreatedByUserId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<RecipeIngredient> Ingredients { get; set; } = new List<RecipeIngredient>();
        public ICollection<RecipeFavorite> Favorites { get; set; } = new List<RecipeFavorite>();
    }

    [Table("recipe_favorites")]
    public class RecipeFavorite
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [Column("recipe_id")]
        public Guid RecipeId { get; set; }

        [ForeignKey(nameof(RecipeId))]
        public Recipe? Recipe { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
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

    [Table("house_messages")]
    public class HouseMessage
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
        [MaxLength(100)]
        [Column("sender_id")]
        public string SenderId { get; set; } = string.Empty;

        [ForeignKey(nameof(SenderId))]
        public User? Sender { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("message_type")]
        public string MessageType { get; set; } = "TEXT"; // TEXT, IMAGE, VIDEO, SYSTEM_ACTION

        [Required]
        [Column("content")]
        public string Content { get; set; } = string.Empty;

        [Column("media_url")]
        public string? MediaUrl { get; set; }

        [Column("media_thumbnail_url")]
        public string? MediaThumbnailUrl { get; set; }

        [Column("action_metadata")]
        public string? ActionMetadataJson { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


