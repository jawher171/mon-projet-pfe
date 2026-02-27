using Microsoft.EntityFrameworkCore.Migrations;

namespace Data.Migrations
{
    public partial class adjusments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_site_id_s",
                table: "stock");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movement_stock_id_sm",
                table: "stock_movement");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "stock_movement",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_movement_Id_s",
                table: "stock_movement",
                column: "Id_s");

            migrationBuilder.CreateIndex(
                name: "IX_stock_Id_site",
                table: "stock",
                column: "Id_site");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_site_Id_site",
                table: "stock",
                column: "Id_site",
                principalTable: "site",
                principalColumn: "Id_site",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movement_stock_Id_s",
                table: "stock_movement",
                column: "Id_s",
                principalTable: "stock",
                principalColumn: "id_s",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_stock_site_Id_site",
                table: "stock");

            migrationBuilder.DropForeignKey(
                name: "FK_stock_movement_stock_Id_s",
                table: "stock_movement");

            migrationBuilder.DropIndex(
                name: "IX_stock_movement_Id_s",
                table: "stock_movement");

            migrationBuilder.DropIndex(
                name: "IX_stock_Id_site",
                table: "stock");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "stock_movement");

            migrationBuilder.AddForeignKey(
                name: "FK_stock_site_id_s",
                table: "stock",
                column: "id_s",
                principalTable: "site",
                principalColumn: "Id_site",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_stock_movement_stock_id_sm",
                table: "stock_movement",
                column: "id_sm",
                principalTable: "stock",
                principalColumn: "id_s",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
