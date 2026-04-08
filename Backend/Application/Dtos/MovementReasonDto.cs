namespace Application.Dtos
{
    /// <summary>Custom movement reason managed from UI and persisted in backend catalog.</summary>
    public class MovementReasonDto
    {
        public string Value { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Type { get; set; } = "entry";
    }
}
