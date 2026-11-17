namespace Kitchy.Core.Enums
{
    public enum ItemUrgency
    {
        Green,   // > 48h (or > 7 days depending on threshold)
        Amber,   // 24h - 48h (Urgent)
        Red      // < 24h (Immediate risk of spoiling)
    }

    public enum ItemSource
    {
        Manual,
        Voice,
        OCR,
        RecipeDelta,
        Barcode
    }

    public enum HouseholdRole
    {
        Admin,
        Member,
        Guest
    }

    public enum StorageLocation
    {
        Nevera,
        Despensa,
        Congelador
    }

    public enum HouseMessageType
    {
        Text,
        Image,
        Video,
        SystemAction
    }

    public enum SystemActionType
    {
        Consumed,
        ScannedTicket,
        AddedManual,
        CookedRecipe
    }
}


