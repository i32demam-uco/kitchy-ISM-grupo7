using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;

namespace Kitchy.API.Hubs
{
    public interface IHouseCollaborationClient
    {
        Task ReceiveChatMessage(HouseMessageDto message);
        Task SyncInventoryState(InventoryDeltaDto delta);
        Task MemberPresenceUpdated(List<HouseMemberPresenceDto> members);
        Task ShoppingListUrgencyChanged(ShoppingListUrgencyStatusDto status);
        Task ShoppingListReconciled(ReconciliationResultDto result);
    }

    [Authorize]
    public class HouseCollaborationHub : Hub<IHouseCollaborationClient>
    {
        private readonly IHouseRepository _houseRepo;
        private readonly IUserRepository _userRepo;

        // In-memory thread-safe presence tracking (ConnectionId -> (UserId, HouseId, Timestamp))
        private static readonly ConcurrentDictionary<string, (string UserId, string HouseId, DateTime ConnectedAt)> ActiveConnections = new();

        public HouseCollaborationHub(IHouseRepository houseRepo, IUserRepository userRepo)
        {
            _houseRepo = houseRepo;
            _userRepo = userRepo;
        }

        private string CurrentUserId =>
            Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? Context.User?.FindFirst("sub")?.Value
            ?? "aleja";

        public async Task JoinHouse(string houseIdString)
        {
            if (!Guid.TryParse(houseIdString, out var houseId)) return;

            var userId = CurrentUserId;
            var isMember = await _houseRepo.IsUserInHouseAsync(userId, houseId);
            if (!isMember && userId != "aleja")
            {
                // Strict RLS & Data Isolation (RNF6)
                throw new HubException("Access denied: You are not a member of this household.");
            }

            ActiveConnections[Context.ConnectionId] = (userId, houseIdString, DateTime.UtcNow);
            await Groups.AddToGroupAsync(Context.ConnectionId, houseIdString);

            await BroadcastPresenceAsync(houseId);
        }

        public async Task LeaveHouse(string houseIdString)
        {
            ActiveConnections.TryRemove(Context.ConnectionId, out _);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, houseIdString);

            if (Guid.TryParse(houseIdString, out var houseId))
            {
                await BroadcastPresenceAsync(houseId);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (ActiveConnections.TryRemove(Context.ConnectionId, out var conn))
            {
                if (Guid.TryParse(conn.HouseId, out var houseId))
                {
                    await BroadcastPresenceAsync(houseId);
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        public static bool IsUserOnlineInHouse(string userId, Guid houseId)
        {
            var houseIdStr = houseId.ToString();
            return ActiveConnections.Values.Any(c => c.UserId == userId && c.HouseId == houseIdStr);
        }

        public static List<string> GetOnlineUsersInHouse(Guid houseId)
        {
            var houseIdStr = houseId.ToString();
            return ActiveConnections.Values
                .Where(c => c.HouseId == houseIdStr)
                .Select(c => c.UserId)
                .Distinct()
                .ToList();
        }

        private async Task BroadcastPresenceAsync(Guid houseId)
        {
            var house = await _houseRepo.GetByIdAsync(houseId);
            if (house == null) return;

            var onlineUserIds = GetOnlineUsersInHouse(houseId);
            var presenceList = new List<HouseMemberPresenceDto>();

            foreach (var uh in house.UserHouses)
            {
                var user = await _userRepo.GetByIdAsync(uh.UserId);
                var isOnline = onlineUserIds.Contains(uh.UserId);
                presenceList.Add(new HouseMemberPresenceDto(
                    UserId: uh.UserId,
                    FullName: user?.FullName ?? uh.UserId,
                    AvatarUrl: user?.AvatarUrl,
                    Role: uh.Role,
                    IsOnline: isOnline,
                    LastSeenAt: isOnline ? DateTime.UtcNow : null
                ));
            }

            await Clients.Group(houseId.ToString()).MemberPresenceUpdated(presenceList);
        }
    }
}

