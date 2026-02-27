using MediatR;

namespace Domain.Commands
{
    public class PutGenericCommand<TEntity> : IRequest<TEntity> where TEntity : class
    {
        public TEntity Entity { get; }

        public PutGenericCommand(TEntity entity)
        {
            Entity = entity;
        }
    }
}
