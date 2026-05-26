using System.Threading;
using System.Threading.Tasks;
using Application.Queries;
using Domain.Interface;
using Domain.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Handlers
{
    /// <summary>Handler for GetProductByBarcodeQuery. Looks up a product by CodeBarre including its Category.</summary>
    public class GetProductByBarcodeHandler : IRequestHandler<GetProductByBarcodeQuery, Product>
    {
        private readonly IGenericRepository<Product> _repository;

        public GetProductByBarcodeHandler(IGenericRepository<Product> repository)
        {
            _repository = repository;
        }

        public async Task<Product> Handle(GetProductByBarcodeQuery request, CancellationToken cancellationToken)
        {
            var barcode = (request.Barcode ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(barcode))
                return null;

            var normalized = barcode.ToLower();

            return await _repository.GetAsync(
                condition: p => p.CodeBarre != null && p.CodeBarre.Trim().ToLower() == normalized,
                includes: q => q.Include(p => p.Categorie),
                cancellationToken: cancellationToken);
        }
    }
}
