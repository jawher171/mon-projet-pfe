using Domain.Models;
using MediatR;

namespace Application.Queries
{
    /// <summary>CQRS query to find a product by its barcode. Returns null when not found.</summary>
    public class GetProductByBarcodeQuery : IRequest<Product>
    {
        public string Barcode { get; }

        public GetProductByBarcodeQuery(string barcode)
        {
            Barcode = barcode;
        }
    }
}
