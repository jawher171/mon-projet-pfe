using System;

namespace Domain.Commands
{
    public class DeleteGenericCommand<TEntity> where TEntity : class
    {
        public Guid Id { get; }

        public DeleteGenericCommand(Guid id)
        {
            Id = id;
        }
    }
}
