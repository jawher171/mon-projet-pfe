using MediatR;

namespace Domain.Commands
{
    public class AddGenericCommand<TEntity> : IRequest<TEntity> where TEntity : class
    {
        public TEntity Entity { get; }

        public AddGenericCommand(TEntity entity)
        {
            Entity = entity;
        }
    }
}
