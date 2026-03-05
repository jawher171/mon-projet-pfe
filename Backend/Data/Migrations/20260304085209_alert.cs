using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Data.Migrations
{
    public partial class alert : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ClosedAt",
                table: "alerts",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Fingerprint",
                table: "alerts",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Severity",
                table: "alerts",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "alerts",
                maxLength: 20,
                nullable: false,
                defaultValue: "Open");

            migrationBuilder.CreateIndex(
                name: "IX_Alert_Fingerprint_Status",
                table: "alerts",
                columns: new[] { "Fingerprint", "Status" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Alert_Fingerprint_Status",
                table: "alerts");

            migrationBuilder.DropColumn(
                name: "ClosedAt",
                table: "alerts");

            migrationBuilder.DropColumn(
                name: "Fingerprint",
                table: "alerts");

            migrationBuilder.DropColumn(
                name: "Severity",
                table: "alerts");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "alerts");
        }
    }
}
