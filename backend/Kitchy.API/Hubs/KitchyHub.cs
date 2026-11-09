using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Kitchy.API.Hubs
{
    public interface IKitchyClient
    {
        Task InventoryUpdated(string action, object? data);
        Task ShoppingListUpdated(string action, object? data);
        Task RecipeStepAdvanced(int stepNumber);
        Task UserJoined(string userId);
    }

    public class KitchyHub : Hub<IKitchyClient>
    {
        public async Task JoinHouseGroup(string houseId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"house_{houseId}");
            await Clients.Group($"house_{houseId}").UserJoined(Context.UserIdentifier ?? "Unknown");
        }

        public async Task LeaveHouseGroup(string houseId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"house_{houseId}");
        }

        public async Task BroadcastStepChange(string houseId, int stepNumber)
        {
            await Clients.Group($"house_{houseId}").RecipeStepAdvanced(stepNumber);
        }
    }
}

