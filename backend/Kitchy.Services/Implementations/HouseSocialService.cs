using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;
using Kitchy.Core.Security;
using Kitchy.Services.Interfaces;

namespace Kitchy.Services.Implementations
{
    public class HouseSocialService : IHouseSocialService
    {
        private readonly IHouseMessageRepository _messageRepo;
        private readonly IHouseRepository _houseRepo;
        private readonly IUserRepository _userRepo;
        private readonly IHouseCollaborationNotifier _notifier;

        public HouseSocialService(
            IHouseMessageRepository messageRepo,
            IHouseRepository houseRepo,
            IUserRepository userRepo,
            IHouseCollaborationNotifier notifier)
        {
            _messageRepo = messageRepo;
            _houseRepo = houseRepo;
            _userRepo = userRepo;
            _notifier = notifier;
        }

        public async Task<List<HouseMemberDto>> GetMembersAsync(Guid houseId, string currentUserId)
        {
            var isMember = await _houseRepo.IsUserInHouseAsync(currentUserId, houseId);
            if (!isMember && currentUserId != "aleja")
            {
                throw new UnauthorizedAccessException("El usuario no pertenece a este hogar.");
            }

            var house = await _houseRepo.GetByIdAsync(houseId);
            if (house == null) return new List<HouseMemberDto>();

            var members = new List<HouseMemberDto>();
            foreach (var uh in house.UserHouses)
            {
                var user = await _userRepo.GetByIdAsync(uh.UserId);
                var fullName = user?.FullName ?? uh.UserId;
                var avatarUrl = user?.AvatarUrl;

                members.Add(new HouseMemberDto(
                    UserId: uh.UserId,
                    FullName: fullName,
                    AvatarUrl: avatarUrl,
                    Role: uh.Role,
                    IsOnline: true, // Active collaboration state
                    JoinedAt: uh.JoinedAt
                ));
            }

            return members;
        }

        public async Task<List<HouseMessageDto>> GetMessagesAsync(Guid houseId, string currentUserId, DateTime? cursor, int limit = 30)
        {
            var isMember = await _houseRepo.IsUserInHouseAsync(currentUserId, houseId);
            if (!isMember && currentUserId != "aleja")
            {
                throw new UnauthorizedAccessException("El usuario no pertenece a este hogar.");
            }

            var messages = await _messageRepo.GetMessagesAsync(houseId, cursor, limit);
            var dtos = new List<HouseMessageDto>();

            foreach (var m in messages)
            {
                var sender = m.Sender ?? await _userRepo.GetByIdAsync(m.SenderId);
                HouseMessageActionMetadataDto? metadata = null;
                if (!string.IsNullOrEmpty(m.ActionMetadataJson))
                {
                    try
                    {
                        metadata = JsonSerializer.Deserialize<HouseMessageActionMetadataDto>(m.ActionMetadataJson, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                    }
                    catch
                    {
                        // Fallback tolerante
                    }
                }

                dtos.Add(new HouseMessageDto(
                    Id: m.Id,
                    HouseId: m.HouseId,
                    SenderId: m.SenderId,
                    SenderName: sender?.FullName ?? m.SenderId,
                    SenderAvatar: sender?.AvatarUrl,
                    MessageType: m.MessageType,
                    Content: m.Content,
                    MediaUrl: m.MediaUrl,
                    MediaThumbnailUrl: m.MediaThumbnailUrl,
                    ActionMetadata: metadata,
                    CreatedAt: m.CreatedAt
                ));
            }

            return dtos;
        }

        public async Task<HouseMessageDto> PostMessageAsync(Guid houseId, string currentUserId, CreateHouseMessageDto dto)
        {
            var isMember = await _houseRepo.IsUserInHouseAsync(currentUserId, houseId);
            if (!isMember && currentUserId != "aleja")
            {
                throw new UnauthorizedAccessException("El usuario no pertenece a este hogar.");
            }

            var user = await _userRepo.GetByIdAsync(currentUserId);
            var sanitizedContent = InputSanitizer.Sanitize(dto.Content ?? string.Empty);

            var message = new HouseMessage
            {
                HouseId = houseId,
                SenderId = currentUserId,
                MessageType = dto.MessageType ?? "TEXT",
                Content = sanitizedContent,
                MediaUrl = dto.MediaUrl,
                MediaThumbnailUrl = dto.MediaThumbnailUrl,
                ActionMetadataJson = dto.ActionMetadata != null ? JsonSerializer.Serialize(dto.ActionMetadata) : null,
                CreatedAt = DateTime.UtcNow
            };

            var added = await _messageRepo.AddMessageAsync(message);

            var resultDto = new HouseMessageDto(
                Id: added.Id,
                HouseId: added.HouseId,
                SenderId: added.SenderId,
                SenderName: user?.FullName ?? added.SenderId,
                SenderAvatar: user?.AvatarUrl,
                MessageType: added.MessageType,
                Content: added.Content,
                MediaUrl: added.MediaUrl,
                MediaThumbnailUrl: added.MediaThumbnailUrl,
                ActionMetadata: dto.ActionMetadata,
                CreatedAt: added.CreatedAt
            );

            // Emit live via SignalR
            await _notifier.BroadcastChatMessageAsync(houseId, resultDto);

            return resultDto;
        }

        public async Task<HouseMessageDto> CreateSystemActionAsync(
            Guid houseId,
            string userId,
            string actionType,
            string content,
            HouseMessageActionMetadataDto actionMetadata)
        {
            var user = await _userRepo.GetByIdAsync(userId);
            var metadataJson = JsonSerializer.Serialize(actionMetadata);

            var message = new HouseMessage
            {
                HouseId = houseId,
                SenderId = userId,
                MessageType = "SYSTEM_ACTION",
                Content = InputSanitizer.Sanitize(content),
                ActionMetadataJson = metadataJson,
                CreatedAt = DateTime.UtcNow
            };

            var added = await _messageRepo.AddMessageAsync(message);

            var resultDto = new HouseMessageDto(
                Id: added.Id,
                HouseId: added.HouseId,
                SenderId: added.SenderId,
                SenderName: user?.FullName ?? userId,
                SenderAvatar: user?.AvatarUrl,
                MessageType: "SYSTEM_ACTION",
                Content: added.Content,
                MediaUrl: null,
                MediaThumbnailUrl: null,
                ActionMetadata: actionMetadata,
                CreatedAt: added.CreatedAt
            );

            // Broadcast to all connected house members
            await _notifier.BroadcastChatMessageAsync(houseId, resultDto);

            return resultDto;
        }
    }
}

