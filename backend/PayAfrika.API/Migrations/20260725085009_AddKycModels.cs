using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PayAfrika.API.Migrations
{
    /// <inheritdoc />
    public partial class AddKycModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "KycApplications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ApplicationType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    RiskScore = table.Column<int>(type: "integer", nullable: false),
                    FraudScore = table.Column<int>(type: "integer", nullable: false),
                    AiConfidenceScore = table.Column<int>(type: "integer", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    MiddleName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Gender = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Nationality = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CountryOfResidence = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    NationalIdNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PassportNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DriversLicenseNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TaxNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PhoneCountryCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ResidentialAddress = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Province = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    City = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    BankName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BankAccountNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BranchCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AccountHolderName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BusinessName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    BusinessRegistrationNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BusinessTaxNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BusinessVatNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    BusinessIndustry = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    BusinessWebsite = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    YearsInOperation = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    CompletedSteps = table.Column<string>(type: "text", nullable: true),
                    Metadata = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KycApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KycApplications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KycDocuments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    KycApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DocumentSide = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    FileData = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OcrData = table.Column<string>(type: "text", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    QualityScore = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KycDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KycDocuments_KycApplications_KycApplicationId",
                        column: x => x.KycApplicationId,
                        principalTable: "KycApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "KycReviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    KycApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewerId = table.Column<Guid>(type: "uuid", nullable: false),
                    Action = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KycReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KycReviews_KycApplications_KycApplicationId",
                        column: x => x.KycApplicationId,
                        principalTable: "KycApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_KycReviews_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KycTimelineEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    KycApplicationId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KycTimelineEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_KycTimelineEvents_KycApplications_KycApplicationId",
                        column: x => x.KycApplicationId,
                        principalTable: "KycApplications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_KycApplications_CreatedAt",
                table: "KycApplications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_KycApplications_Status",
                table: "KycApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_KycApplications_UserId",
                table: "KycApplications",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_KycDocuments_DocumentType",
                table: "KycDocuments",
                column: "DocumentType");

            migrationBuilder.CreateIndex(
                name: "IX_KycDocuments_KycApplicationId",
                table: "KycDocuments",
                column: "KycApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_KycReviews_KycApplicationId",
                table: "KycReviews",
                column: "KycApplicationId");

            migrationBuilder.CreateIndex(
                name: "IX_KycReviews_ReviewerId",
                table: "KycReviews",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_KycTimelineEvents_CreatedAt",
                table: "KycTimelineEvents",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_KycTimelineEvents_KycApplicationId",
                table: "KycTimelineEvents",
                column: "KycApplicationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "KycDocuments");

            migrationBuilder.DropTable(
                name: "KycReviews");

            migrationBuilder.DropTable(
                name: "KycTimelineEvents");

            migrationBuilder.DropTable(
                name: "KycApplications");
        }
    }
}
