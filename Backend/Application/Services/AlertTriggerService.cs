using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Domain.Commands;
using Domain.Handlers;
using Domain.Interface;
using Domain.Models;
using Domain.Queries;

namespace Application.Services
{
    /// <summary>Automatically creates low_stock alerts when product quantity is at or below SeuilAlerte. Message includes réapprovisionnement nécessaire.</summary>
    public class AlertTriggerService : IAlertTriggerService
    {
        private readonly IGenericRepository<Alert> _alertRepository;

        public AlertTriggerService(IGenericRepository<Alert> alertRepository)
        {
            _alertRepository = alertRepository;
        }

        public async Task TryCreateLowStockAlertAsync(Stock stock, CancellationToken cancellationToken = default)
        {
            if (stock.QuantiteDisponible > stock.SeuilAlerte)
                return;

            var produitNom = stock.Produit?.Nom ?? "Produit";
            var siteNom = stock.Site?.Nom ?? "Site";

            var exists = await HasUnresolvedAlertAsync(stock.id_s, "low_stock", cancellationToken);
            if (exists)
                return;

            var message = stock.QuantiteDisponible <= 0
                ? $"Rupture de stock pour {produitNom} au site {siteNom}. Réapprovisionnement nécessaire."
                : $"Stock bas pour {produitNom} au site {siteNom}: quantité ({stock.QuantiteDisponible}) inférieure au seuil ({stock.SeuilAlerte}). Réapprovisionnement nécessaire.";

            var alert = new Alert
            {
                Id_a = Guid.NewGuid(),
                Type = "low_stock",
                Message = message,
                DateCreation = DateTime.UtcNow,
                Resolue = false,
                id_s = stock.id_s
            };

            var handler = new AddGenericHandler<Alert>(_alertRepository);
            await handler.Handle(new AddGenericCommand<Alert>(alert), cancellationToken);
        }

        private async Task<bool> HasUnresolvedAlertAsync(Guid stockId, string alertType, CancellationToken ct)
        {
            var existing = await (new GetListGenericHandler<Alert>(_alertRepository))
                .Handle(
                    new GetListGenericQuery<Alert>(
                        condition: x => x.id_s == stockId && !x.Resolue && x.Type == alertType,
                        includes: null),
                    ct);
            return existing.Any();
        }
    }
}
