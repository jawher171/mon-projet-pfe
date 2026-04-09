namespace Domain.Enums
{
    /// <summary>Alert types stored as strings in DB. ONLY these values are valid.</summary>
    public enum AlertType
    {
        ENTRY_VALIDATED,
        EXIT_VALIDATED,
        TRANSFER_VALIDATED,
        MIN_STOCK,
        OUT_OF_STOCK,
        SITE_CAPACITY_NEAR_MAXIMUM,
        SITE_CAPACITY_MAXIMUM,
        STOCK_NEAR_MAXIMUM,
        STOCK_MAXIMUM,
        STOCK_ALERTE,
        STOCK_SECURITE
    }
}
