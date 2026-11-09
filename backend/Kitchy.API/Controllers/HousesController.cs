using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Kitchy.Core.DTOs;
using Kitchy.Core.Interfaces;
using Kitchy.Core.Models;

namespace Kitchy.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class HousesController : BaseKitchyController
    {
        private readonly IHouseRepository _houseRepo;

        public HousesController(IHouseRepository houseRepo)
        {
            _houseRepo = houseRepo;
        }

        [HttpGet]
        [HttpGet("list")]
        public async Task<ActionResult<List<HouseDto>>> GetUserHouses()
        {
            var houses = await _houseRepo.GetHousesForUserAsync(CurrentUserId);
            var dtos = houses.Select(h => new HouseDto(
                Id: h.Id,
                Name: h.Name,
                Address: h.Address,
                Latitude: h.Latitude,
                Longitude: h.Longitude,
                InviteCode: h.InviteCode,
                MemberCount: h.UserHouses.Count,
                JoinCode: h.InviteCode
            )).ToList();

            return Ok(dtos);
        }

        [HttpPost]
        [HttpPost("create")]
        public async Task<ActionResult<HouseDto>> CreateHouse([FromBody] CreateHouseDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest("Name is required.");
            }

            var joinCode = Generate6CharJoinCode();

            var house = new House
            {
                Name = dto.Name.Trim(),
                Address = dto.Address?.Trim() ?? "Córdoba, España",
                Latitude = dto.Latitude ?? 37.888,
                Longitude = dto.Longitude ?? -4.779,
                InviteCode = joinCode
            };

            var created = await _houseRepo.CreateHouseAsync(house, CurrentUserId);

            return CreatedAtAction(nameof(GetUserHouses), new { }, new HouseDto(
                Id: created.Id,
                Name: created.Name,
                Address: created.Address,
                Latitude: created.Latitude,
                Longitude: created.Longitude,
                InviteCode: created.InviteCode,
                MemberCount: 1,
                JoinCode: created.InviteCode
            ));
        }

        [HttpPost("join")]
        public async Task<ActionResult<HouseDto>> JoinHouse([FromBody] JoinHouseDto dto)
        {
            var code = dto.EffectiveCode;
            if (string.IsNullOrWhiteSpace(code))
            {
                return BadRequest("Join code is required.");
            }

            var house = await _houseRepo.GetByInviteCodeAsync(code);
            if (house == null)
            {
                return NotFound("House not found for the provided join code.");
            }

            await _houseRepo.AddUserToHouseAsync(CurrentUserId, house.Id, "Member");

            return Ok(new HouseDto(
                Id: house.Id,
                Name: house.Name,
                Address: house.Address,
                Latitude: house.Latitude,
                Longitude: house.Longitude,
                InviteCode: house.InviteCode,
                MemberCount: house.UserHouses.Count + 1,
                JoinCode: house.InviteCode
            ));
        }

        private static string Generate6CharJoinCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 6).Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }
}
