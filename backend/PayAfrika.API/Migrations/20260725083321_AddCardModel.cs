using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PayAfrika.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCardModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    LastFour = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    Expiry = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    CardholderName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    IsFrozen = table.Column<bool>(type: "boolean", nullable: false),
                    IsVirtual = table.Column<bool>(type: "boolean", nullable: false),
                    Limit = table.Column<decimal>(type: "numeric", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cards_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cards_IsActive",
                table: "Cards",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Cards_UserId",
                table: "Cards",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cards");
        }
    }
}
