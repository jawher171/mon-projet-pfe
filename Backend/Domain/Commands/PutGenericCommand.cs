namespace Domain.Commands
{
    public class PutGenericCommand<TEntity> where TEntity : class
    {
        public TEntity Entity { get; }

        public PutGenericCommand(TEntity entity)
        {
            Entity = entity;
        }
    }
}
