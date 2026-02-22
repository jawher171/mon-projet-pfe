using System;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Data.Migrations
{
    public partial class newDB : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "category",
                columns: table => new
                {
                    Id_c = table.Column<Guid>(nullable: false),
                    Libelle = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_category", x => x.Id_c);
                });

            migrationBuilder.CreateTable(
                name: "permission",
                columns: table => new
                {
                    permissionId = table.Column<Guid>(nullable: false),
                    Code_p = table.Column<string>(nullable: true),
                    Description = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_permission", x => x.permissionId);
                });

            migrationBuilder.CreateTable(
                name: "role",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(nullable: false),
                    Nom = table.Column<string>(nullable: true),
                    Description = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_role", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "site",
                columns: table => new
                {
                    Id_site = table.Column<Guid>(nullable: false),
                    Nom = table.Column<string>(nullable: true),
                    Adresse = table.Column<string>(nullable: true),
                    Ville = table.Column<string>(nullable: true),
                    code_fiscale = table.Column<string>(nullable: true),
                    Telephone = table.Column<string>(nullable: true),
                    Email = table.Column<string>(nullable: true),
                    ResponsableSite = table.Column<string>(nullable: true),
                    Type = table.Column<string>(nullable: true),
                    Capacite = table.Column<int>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_site", x => x.Id_site);
                });

            migrationBuilder.CreateTable(
                name: "Product",
                columns: table => new
                {
                    id_p = table.Column<Guid>(nullable: false),
                    Nom = table.Column<string>(nullable: true),
                    Description = table.Column<string>(nullable: true),
                    CodeBarre = table.Column<string>(nullable: true),
                    Prix = table.Column<double>(nullable: false),
                    id_c = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Product", x => x.id_p);
                    table.ForeignKey(
                        name: "FK_Product_category_id_c",
                        column: x => x.id_c,
                        principalTable: "category",
                        principalColumn: "Id_c",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rolepermission",
                columns: table => new
                {
                    id_RP = table.Column<Guid>(nullable: false),
                    RoleId = table.Column<Guid>(nullable: false),
                    permissionId = table.Column<Guid>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rolepermission", x => x.id_RP);
                    table.ForeignKey(
                        name: "FK_rolepermission_role_RoleId",
                        column: x => x.RoleId,
                        principalTable: "role",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_rolepermission_permission_permissionId",
                        column: x => x.permissionId,
                        principalTable: "permission",
                        principalColumn: "permissionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id_u = table.Column<Guid>(nullable: false),
                    Nom = table.Column<string>(nullable: true),
                    Prenom = table.Column<string>(nullable: true),
                    Email = table.Column<string>(nullable: true),
                    MotDePasse = table.Column<string>(nullable: true),
                    Status = table.Column<bool>(nullable: false),
                    RoleId = table.Column<Guid>(nullable: false),
                    LastLogin = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id_u);
                    table.ForeignKey(
                        name: "FK_users_role_RoleId",
                        column: x => x.RoleId,
                        principalTable: "role",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stock",
                columns: table => new
                {
                    id_s = table.Column<Guid>(nullable: false),
                    QuantiteDisponible = table.Column<int>(nullable: false),
                    SeuilAlerte = table.Column<int>(nullable: false),
                    id_p = table.Column<Guid>(nullable: false),
                    Id_site = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock", x => x.id_s);
                    table.ForeignKey(
                        name: "FK_stock_Product_id_p",
                        column: x => x.id_p,
                        principalTable: "Product",
                        principalColumn: "id_p",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_stock_site_id_s",
                        column: x => x.id_s,
                        principalTable: "site",
                        principalColumn: "Id_site",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "alerts",
                columns: table => new
                {
                    Id_a = table.Column<Guid>(nullable: false),
                    Type = table.Column<string>(nullable: true),
                    Message = table.Column<string>(nullable: true),
                    DateCreation = table.Column<DateTime>(nullable: false),
                    Resolue = table.Column<bool>(nullable: false),
                    id_s = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alerts", x => x.Id_a);
                    table.ForeignKey(
                        name: "FK_alerts_stock_id_s",
                        column: x => x.id_s,
                        principalTable: "stock",
                        principalColumn: "id_s",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "stock_movement",
                columns: table => new
                {
                    id_sm = table.Column<Guid>(nullable: false),
                    DateMouvement = table.Column<DateTime>(nullable: false),
                    Raison = table.Column<string>(nullable: true),
                    Quantite = table.Column<int>(nullable: false),
                    Note = table.Column<string>(nullable: true),
                    Id_s = table.Column<Guid>(nullable: false),
                    Id_u = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_movement", x => x.id_sm);
                    table.ForeignKey(
                        name: "FK_stock_movement_users_Id_u",
                        column: x => x.Id_u,
                        principalTable: "users",
                        principalColumn: "Id_u",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_stock_movement_stock_id_sm",
                        column: x => x.id_sm,
                        principalTable: "stock",
                        principalColumn: "id_s",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_alerts_id_s",
                table: "alerts",
                column: "id_s");

            migrationBuilder.CreateIndex(
                name: "IX_Product_id_c",
                table: "Product",
                column: "id_c");

            migrationBuilder.CreateIndex(
                name: "IX_rolepermission_RoleId",
                table: "rolepermission",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_rolepermission_permissionId",
                table: "rolepermission",
                column: "permissionId");

            migrationBuilder.CreateIndex(
                name: "IX_stock_id_p",
                table: "stock",
                column: "id_p");

            migrationBuilder.CreateIndex(
                name: "IX_stock_movement_Id_u",
                table: "stock_movement",
                column: "Id_u");

            migrationBuilder.CreateIndex(
                name: "IX_users_RoleId",
                table: "users",
                column: "RoleId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alerts");

            migrationBuilder.DropTable(
                name: "rolepermission");

            migrationBuilder.DropTable(
                name: "stock_movement");

            migrationBuilder.DropTable(
                name: "permission");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "stock");

            migrationBuilder.DropTable(
                name: "role");

            migrationBuilder.DropTable(
                name: "Product");

            migrationBuilder.DropTable(
                name: "site");

            migrationBuilder.DropTable(
                name: "category");
        }
    }
}
