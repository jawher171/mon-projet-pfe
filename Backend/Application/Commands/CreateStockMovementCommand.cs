using System;
using Application.Dtos;
using MediatR;

namespace Application.Commands
{
    /// <summary>Command to create a stock movement with automatic stock quantity adjustment and alert triggering.</summary>
    public class CreateStockMovementCommand : IRequest<CreateStockMovementResult>
    {
        public StockMovementDto Dto { get; }

        public CreateStockMovementCommand(StockMovementDto dto)
        {
            Dto = dto;
        }
    }

    public class CreateStockMovementResult
    {
        public bool Success { get; set; }
        public StockMovementDto Movement { get; set; }
        public string ErrorMessage { get; set; }

        public static CreateStockMovementResult Ok(StockMovementDto movement) =>
            new CreateStockMovementResult { Success = true, Movement = movement };

        public static CreateStockMovementResult Fail(string error) =>
            new CreateStockMovementResult { Success = false, ErrorMessage = error };
    }
}
