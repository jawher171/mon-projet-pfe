using System;
using Application.Dtos;
using MediatR;

namespace Application.Commands
{
    /// <summary>Command to delete a stock movement with automatic stock quantity reversal.</summary>
    public class DeleteStockMovementCommand : IRequest<DeleteStockMovementResult>
    {
        public Guid Id { get; }

        public DeleteStockMovementCommand(Guid id)
        {
            Id = id;
        }
    }

    public class DeleteStockMovementResult
    {
        public bool Success { get; set; }
        public bool NotFound { get; set; }
        public string ErrorMessage { get; set; }

        public static DeleteStockMovementResult Ok() =>
            new DeleteStockMovementResult { Success = true };

        public static DeleteStockMovementResult Fail(string error) =>
            new DeleteStockMovementResult { Success = false, ErrorMessage = error };

        public static DeleteStockMovementResult NotFoundResult(string error = "Movement not found.") =>
            new DeleteStockMovementResult { Success = false, NotFound = true, ErrorMessage = error };
    }
}
