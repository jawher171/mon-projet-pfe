using System;

namespace Domain.Commands
{
    public class RemoveGenericCommand
    {
        public Guid Id { get; }

        public RemoveGenericCommand(Guid id)
        {
            Id = id;
        }
    }
}
