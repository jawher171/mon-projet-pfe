using System;
using System.Linq;
using System.Threading.Tasks;
using Data.Context;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Application.Services
{
    /// <summary>
    /// ValidationService — Diagrammes de séquence (Figures 3.4, 3.5, 4.2, 4.4, 4.5, 5.2, 5.3)
    /// Centralise toutes les règles de validation métier utilisées par les contrôleurs.
    /// </summary>
    public interface IValidationService
    {
        // ─── Utilisateurs (Fig 3.4) ───
        (bool IsValid, string? Error) ValidateUserData(string? email, string? password, string? nom, string? prenom);
        Task<bool> CheckEmailUnique(string email, Guid? excludeUserId = null);

        // ─── Rôles (Fig 3.5) ───
        (bool IsValid, string? Error) ValidateRole(string? nom);

        // ─── Produits (Fig 4.2) ───
        (bool IsValid, string? Error) ValidateProductData(string? nom, decimal? prix);
        Task<bool> CheckCodeBarreUnique(string codeBarre, Guid? excludeProductId = null);
        Task<bool> CheckProductHasStock(Guid productId);

        // ─── Catégories (Fig 4.4) ───
        (bool IsValid, string? Error) ValidateCategoryData(string? nom);
        Task<bool> CheckCategoryNomUnique(string nom, Guid? excludeCategoryId = null);
        Task<bool> CheckCategoryHasProducts(Guid categoryId);

        // ─── Sites (Fig 4.5) ───
        (bool IsValid, string? Error) ValidateSiteData(string? nom, string? adresse, string? ville);
        Task<bool> CheckSiteNomUnique(string nom, Guid? excludeSiteId = null);
        Task<bool> CheckSiteHasStock(Guid siteId);

        // ─── Mouvements (Fig 5.2, 5.3) ───
        (bool IsValid, string? Error) ValidateMovementData(int quantite, string? raison);
        Task<bool> CheckStockSuffisant(Guid stockId, int quantiteDemandee);

        // ─── Transfert (Fig 5.5) ───
        (bool IsValid, string? Error) ValidateTransferData(Guid sourceSiteId, Guid destSiteId, int quantite);

        // ─── Raisons (Fig 5.6) ───
        (bool IsValid, string? Error) ValidateRaisonData(string? libelle, string? type);
        Task<bool> CheckRaisonUsed(string raison);

        // ─── Seuils (Fig 6.2) ───
        (bool IsValid, string? Error) ValidateSeuils(int seuilMinimum, int seuilAlerte, int seuilSecurite, int seuilMaximum);
    }

    public class ValidationService : IValidationService
    {
        private readonly AppDbContext _context;

        public ValidationService(AppDbContext context)
        {
            _context = context;
        }

        // ─── Utilisateurs ───

        public (bool IsValid, string? Error) ValidateUserData(string? email, string? password, string? nom, string? prenom)
        {
            if (string.IsNullOrWhiteSpace(email))
                return (false, "L'email est obligatoire.");
            if (string.IsNullOrWhiteSpace(password))
                return (false, "Le mot de passe est obligatoire.");
            if (string.IsNullOrWhiteSpace(nom))
                return (false, "Le nom est obligatoire.");
            if (string.IsNullOrWhiteSpace(prenom))
                return (false, "Le prénom est obligatoire.");
            return (true, null);
        }

        public async Task<bool> CheckEmailUnique(string email, Guid? excludeUserId = null)
        {
            var trimmed = email.Trim().ToLower();
            var query = _context.users.Where(u => u.Email.ToLower() == trimmed);
            if (excludeUserId.HasValue)
                query = query.Where(u => u.Id_u != excludeUserId.Value);
            return !await query.AnyAsync();
        }

        // ─── Rôles ───

        public (bool IsValid, string? Error) ValidateRole(string? nom)
        {
            if (string.IsNullOrWhiteSpace(nom))
                return (false, "Le nom du rôle est obligatoire.");
            return (true, null);
        }

        // ─── Produits ───

        public (bool IsValid, string? Error) ValidateProductData(string? nom, decimal? prix)
        {
            if (string.IsNullOrWhiteSpace(nom))
                return (false, "Le nom du produit est obligatoire.");
            if (prix.HasValue && prix < 0)
                return (false, "Le prix ne peut pas être négatif.");
            return (true, null);
        }

        public async Task<bool> CheckCodeBarreUnique(string codeBarre, Guid? excludeProductId = null)
        {
            var trimmed = codeBarre.Trim();
            var query = _context.Product.Where(p => p.CodeBarre == trimmed);
            if (excludeProductId.HasValue)
                query = query.Where(p => p.id_p != excludeProductId.Value);
            return !await query.AnyAsync();
        }

        public async Task<bool> CheckProductHasStock(Guid productId)
        {
            return await _context.stock.AnyAsync(s => s.id_p == productId);
        }

        // ─── Catégories ───

        public (bool IsValid, string? Error) ValidateCategoryData(string? nom)
        {
            if (string.IsNullOrWhiteSpace(nom))
                return (false, "Le nom de la catégorie est obligatoire.");
            return (true, null);
        }

        public async Task<bool> CheckCategoryNomUnique(string nom, Guid? excludeCategoryId = null)
        {
            var trimmed = nom.Trim().ToLower();
            var query = _context.category.Where(c => c.Libelle.ToLower() == trimmed);
            if (excludeCategoryId.HasValue)
                query = query.Where(c => c.Id_c != excludeCategoryId.Value);
            return !await query.AnyAsync();
        }

        public async Task<bool> CheckCategoryHasProducts(Guid categoryId)
        {
            return await _context.Product.AnyAsync(p => p.id_c == categoryId);
        }

        // ─── Sites ───

        public (bool IsValid, string? Error) ValidateSiteData(string? nom, string? adresse, string? ville)
        {
            if (string.IsNullOrWhiteSpace(nom))
                return (false, "Le nom du site est obligatoire.");
            if (string.IsNullOrWhiteSpace(adresse))
                return (false, "L'adresse est obligatoire.");
            if (string.IsNullOrWhiteSpace(ville))
                return (false, "La ville est obligatoire.");
            return (true, null);
        }

        public async Task<bool> CheckSiteNomUnique(string nom, Guid? excludeSiteId = null)
        {
            var trimmed = nom.Trim().ToLower();
            var query = _context.site.Where(s => s.Nom.ToLower() == trimmed);
            if (excludeSiteId.HasValue)
                query = query.Where(s => s.Id_site != excludeSiteId.Value);
            return !await query.AnyAsync();
        }

        public async Task<bool> CheckSiteHasStock(Guid siteId)
        {
            return await _context.stock.AnyAsync(s => s.Id_site == siteId);
        }

        // ─── Mouvements ───

        public (bool IsValid, string? Error) ValidateMovementData(int quantite, string? raison)
        {
            if (quantite <= 0)
                return (false, "La quantité doit être supérieure à 0.");
            if (string.IsNullOrWhiteSpace(raison))
                return (false, "La raison du mouvement est obligatoire.");
            return (true, null);
        }

        public async Task<bool> CheckStockSuffisant(Guid stockId, int quantiteDemandee)
        {
            var stock = await _context.stock.FindAsync(stockId);
            if (stock == null) return false;
            return stock.QuantiteDisponible >= quantiteDemandee;
        }

        // ─── Transfert ───

        public (bool IsValid, string? Error) ValidateTransferData(Guid sourceSiteId, Guid destSiteId, int quantite)
        {
            if (sourceSiteId == destSiteId)
                return (false, "Magasin source = magasin destination");
            if (quantite <= 0)
                return (false, "La quantité doit être supérieure à 0.");
            return (true, null);
        }

        // ─── Raisons ───

        public (bool IsValid, string? Error) ValidateRaisonData(string? libelle, string? type)
        {
            if (string.IsNullOrWhiteSpace(libelle))
                return (false, "Le libellé de la raison est obligatoire.");
            if (string.IsNullOrWhiteSpace(type))
                return (false, "Le type de mouvement est obligatoire.");
            return (true, null);
        }

        public async Task<bool> CheckRaisonUsed(string raison)
        {
            return await _context.stock_movement.AnyAsync(m => m.Raison == raison);
        }

        // ─── Seuils ───

        public (bool IsValid, string? Error) ValidateSeuils(int seuilMinimum, int seuilAlerte, int seuilSecurite, int seuilMaximum)
        {
            if (seuilMinimum < 0 || seuilAlerte < 0 || seuilSecurite < 0 || seuilMaximum < 0)
                return (false, "Valeur négative non autorisée");
            
            if (!(seuilSecurite <= seuilMinimum && seuilMinimum <= seuilAlerte && seuilAlerte <= seuilMaximum))
                return (false, "Valeurs incohérentes — vérifier l'ordre des seuils");

            return (true, null);
        }
    }
}
