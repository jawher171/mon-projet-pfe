using System;
using System.Collections.Generic;
using System.Text;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Data.Context
{
    /// <summary>EF Core DbContext. Configures entities and relationships for inventory DB.</summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }
        public DbSet<User> users { get; set; }
        public DbSet<Alert> alerts { get; set; }
        public DbSet<Category> category { get; set; }
        public DbSet<Product> Product { get; set; }
        public DbSet<Role> role { get; set; }
        public DbSet<RolePermission> rolepermission { get; set; }
        public DbSet<Site> site { get; set; }
        public DbSet<Stock> stock { get; set; }
        public DbSet<StockMovement> stock_movement { get; set; }
        public DbSet<Permission> permission { get; set; }




        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Role - Permission (many-to-many via RolePermission)
            modelBuilder.Entity<RolePermission>()
           .HasKey(rp => new { rp.id_RP });

            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId);
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.permissionId);

            // Utilisateur -> Role (N:1)
            modelBuilder.Entity<User>()
                .HasKey(rp => new { rp.Id_u });
            modelBuilder.Entity<User>()
               .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId);

            // Categorie -> Produit (1:N)
            modelBuilder.Entity<Product>()
                .HasKey(rp => new { rp.id_p});
            modelBuilder.Entity<Product>()
                .HasOne(p => p.Categorie)
                .WithMany(c => c.Produits)
                .HasForeignKey(p => p.id_c);

            // Produit, Site -> Stock (Stock = Produit x Site)
            modelBuilder.Entity<Stock>()
                .HasKey(rp => new { rp.id_s });
            modelBuilder.Entity<Stock>()
                .HasOne(s => s.Produit)
                .WithMany(p => p.Stocks)
                .HasForeignKey(s => s.id_p);

            modelBuilder.Entity<Stock>()
                .HasOne(s => s.Site)
                .WithMany(site => site.Stocks)
                .HasForeignKey(s => s.Id_site);

            // Stock -> MouvementStock, Utilisateur -> MouvementStock
            modelBuilder.Entity<StockMovement>()
                .HasKey(rp => new { rp.id_sm });
            modelBuilder.Entity<StockMovement>()
                .HasOne(m => m.Stock)
                .WithMany(s => s.MouvementsStock)
                .HasForeignKey(m => m.Id_s);
            modelBuilder.Entity<StockMovement>()
                .HasOne(m => m.Utilisateur)
                .WithMany(u => u.MouvementsStock)
                .HasForeignKey(m => m.Id_u);

            // Stock -> Alerte
            modelBuilder.Entity<Alert>()
                .HasKey(rp => new { rp.Id_a });
            modelBuilder.Entity<Alert>()
                .HasOne(a => a.Stock)
                .WithMany(s => s.Alertes)
                .HasForeignKey(a => a.id_s);

            // Alert: Fingerprint stored as string, indexed for dedup queries
            modelBuilder.Entity<Alert>()
                .Property(a => a.Fingerprint)
                .HasMaxLength(300);
            modelBuilder.Entity<Alert>()
                .HasIndex(a => new { a.Fingerprint, a.Status })
                .HasName("IX_Alert_Fingerprint_Status");
            modelBuilder.Entity<Alert>()
                .Property(a => a.Severity)
                .HasMaxLength(20);
            modelBuilder.Entity<Alert>()
                .Property(a => a.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Open");

            modelBuilder.Entity<Category>()
                .HasKey(rp => new { rp.Id_c });

            modelBuilder.Entity<Site>()
                .HasKey(rp => new { rp.Id_site });

            modelBuilder.Entity<StockMovement>()
                .HasKey(rp => new { rp.id_sm });

            modelBuilder.Entity<Role>()
                .HasKey(rp => new { rp.RoleId });
        }
    }
}