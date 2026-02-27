using System;
using MediatR;

namespace Domain.Commands
{
    public class RemoveGenericCommand<TEntity> : IRequest<TEntity> where TEntity : class
    {
        public Guid Id { get; }

        public RemoveGenericCommand(Guid id)
        {
            Id = id;
        }
    }
}
