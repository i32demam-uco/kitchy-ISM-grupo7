using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;

namespace Kitchy.API.Hubs
{
    public class HouseCollaborationNotifier : IHouseCollaborationNotifier
    {
        private readonly IHubContext<HouseCollaborationHub, IHouseCollaborationClient> _hubContext;
        private readonly IHubContext<KitchyHub, IKitchyClient> _legacyKitchyHub;

        public HouseCollaborationNotifier(
            IHubContext<HouseCollaborationHub, IHouseCollaborationClient> hubContext,
            IHubContext<KitchyHub, IKitchyClient> legacyKitchyHub)
        {
            _hubContext = hubContext;
            _legacyKitchyHub = legacyKitchyHub;
        }

        public async Task BroadcastChatMessageAsync(Guid houseId, HouseMessageDto message)
        {
            await _hubContext.Clients.Group(houseId.ToString()).ReceiveChatMessage(message);
        }

        public async Task BroadcastInventoryDeltaAsync(Guid houseId, InventoryDeltaDto delta)
        {
            // Real-time broadcast to HouseCollaborationHub clients
            await _hubContext.Clients.Group(houseId.ToString()).SyncInventoryState(delta);

            // Backwards compatibility with existing KitchyHub
            await _legacyKitchyHub.Clients.Group($"house_{houseId}").InventoryUpdated(delta.Action, delta);
        }

        public async Task BroadcastMemberPresenceAsync(Guid houseId, List<HouseMemberPresenceDto> members)
        {
            await _hubContext.Clients.Group(houseId.ToString()).MemberPresenceUpdated(members);
        }

        public async Task BroadcastShoppingListUrgencyChangedAsync(Guid houseId, ShoppingListUrgencyStatusDto status)
        {
            await _hubContext.Clients.Group(houseId.ToString()).ShoppingListUrgencyChanged(status);
            await _legacyKitchyHub.Clients.Group($"house_{houseId}").ShoppingListUrgencyChanged(status);
        }

        public async Task BroadcastShoppingListReconciledAsync(Guid houseId, ReconciliationResultDto result)
        {
            await _hubContext.Clients.Group(houseId.ToString()).ShoppingListReconciled(result);
            await _legacyKitchyHub.Clients.Group($"house_{houseId}").ShoppingListUpdated("Reconciled", result);
        }
    }
}

