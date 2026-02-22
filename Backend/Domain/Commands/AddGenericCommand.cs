namespace Domain.Commands
{
    public class AddGenericCommand<TEntity> where TEntity : class
    {
        public TEntity Entity { get; }

        public AddGenericCommand(TEntity entity)
        {
            Entity = entity;
        }
    }
}
