using System;
using Application.Dtos;
using MediatR;

namespace Application.Commands
{
    /// <summary>Command to update a stock movement with automatic stock quantity reversal/reapplication and alert triggering.</summary>
    public class UpdateStockMovementCommand : IRequest<UpdateStockMovementResult>
    {
        public StockMovementDto Dto { get; }

        public UpdateStockMovementCommand(StockMovementDto dto)
        {
            Dto = dto;
        }
    }

    public class UpdateStockMovementResult
    {
        public bool Success { get; set; }
        public bool NotFound { get; set; }
        public StockMovementDto Movement { get; set; }
        public string ErrorMessage { get; set; }

        public static UpdateStockMovementResult Ok(StockMovementDto movement) =>
            new UpdateStockMovementResult { Success = true, Movement = movement };

        public static UpdateStockMovementResult Fail(string error) =>
            new UpdateStockMovementResult { Success = false, ErrorMessage = error };

        public static UpdateStockMovementResult NotFoundResult(string error = "Movement not found.") =>
            new UpdateStockMovementResult { Success = false, NotFound = true, ErrorMessage = error };
    }
}
