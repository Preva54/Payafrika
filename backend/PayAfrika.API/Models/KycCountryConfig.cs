using System.ComponentModel.DataAnnotations;

namespace PayAfrika.API.Models;

public class KycCountryConfig
{
    [Key, MaxLength(3)]
    public string CountryCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string CountryName { get; set; } = string.Empty;

    /// <summary>JSON list of identity document types accepted (national_id, passport, drivers_license, residence_permit).</summary>
    public string IdentityDocumentTypes { get; set; } = "[\"national_id\",\"passport\",\"drivers_license\"]";

    /// <summary>JSON list of address document types accepted (utility_bill, bank_statement, government_letter, municipal_statement).</summary>
    public string AddressDocumentTypes { get; set; } = "[\"utility_bill\",\"bank_statement\",\"government_letter\"]";

    public bool IdentityDocBackRequired { get; set; }

    /// <summary>Max age of address documents in months.</summary>
    public int AddressDocMaxAgeMonths { get; set; } = 3;

    /// <summary>Minimum KYC level required for this jurisdiction (0-3).</summary>
    public int RequiredLevel { get; set; } = 3;

    public bool IsEnabled { get; set; } = true;
}
