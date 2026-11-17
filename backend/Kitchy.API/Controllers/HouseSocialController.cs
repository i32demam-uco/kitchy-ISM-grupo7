using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Security;
using Kitchy.Services.Interfaces;

namespace Kitchy.API.Controllers
{
    [ApiController]
    [Route("api/houses/{houseId}")]
    [Authorize]
    public class HouseSocialController : BaseKitchyController
    {
        private readonly IHouseSocialService _socialService;
        private readonly IHouseRepository _houseRepo;

        public HouseSocialController(
            IHouseSocialService socialService,
            IHouseRepository houseRepo)
        {
            _socialService = socialService;
            _houseRepo = houseRepo;
        }

        [HttpGet("members")]
        public async Task<ActionResult<List<HouseMemberDto>>> GetMembers(Guid houseId)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId))
            {
                return Forbid();
            }

            var members = await _socialService.GetMembersAsync(houseId, CurrentUserId);
            return Ok(members);
        }

        [HttpGet("messages")]
        public async Task<ActionResult<List<HouseMessageDto>>> GetMessages(
            Guid houseId,
            [FromQuery] DateTime? cursor = null,
            [FromQuery] int limit = 30)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId))
            {
                return Forbid();
            }

            var messages = await _socialService.GetMessagesAsync(houseId, CurrentUserId, cursor, limit);
            return Ok(messages);
        }

        [HttpPost("messages")]
        public async Task<ActionResult<HouseMessageDto>> PostMessage(
            Guid houseId,
            [FromBody] CreateHouseMessageDto dto)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId))
            {
                return Forbid();
            }

            if (string.IsNullOrWhiteSpace(dto.Content) && string.IsNullOrWhiteSpace(dto.MediaUrl))
            {
                return BadRequest(new { message = "El mensaje o recurso multimedia no puede estar vacío." });
            }

            var created = await _socialService.PostMessageAsync(houseId, CurrentUserId, dto);
            return Ok(created);
        }

        [HttpPost("messages/upload")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<HouseMessageDto>> UploadMediaMessage(
            Guid houseId,
            [FromForm] IFormFile file,
            [FromForm] string? content = null)
        {
            if (!await ValidateHouseAccessAsync(_houseRepo, houseId))
            {
                return Forbid();
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No se ha subido ningún archivo." });
            }

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            if (!MediaValidator.ValidateMedia(memoryStream, file.FileName, file.ContentType, out var error))
            {
                return BadRequest(new { message = error });
            }

            // In local/hybrid setup: simulate Supabase Storage bucket 'house-chat-media'
            var isVideo = file.ContentType.StartsWith("video/") || file.FileName.EndsWith(".mp4") || file.FileName.EndsWith(".mov");
            var mockBucketUrl = $"https://supabase.kitchy.local/storage/v1/object/public/house-chat-media/{houseId}/{Guid.NewGuid()}_{file.FileName}";
            var thumbnailUrl = isVideo
                ? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"
                : mockBucketUrl;

            var messageDto = new CreateHouseMessageDto(
                Content: content ?? (isVideo ? "Vídeo compartido" : "Foto compartida"),
                MessageType: isVideo ? "VIDEO" : "IMAGE",
                MediaUrl: mockBucketUrl,
                MediaThumbnailUrl: thumbnailUrl
            );

            var created = await _socialService.PostMessageAsync(houseId, CurrentUserId, messageDto);
            return Ok(created);
        }
    }
}

