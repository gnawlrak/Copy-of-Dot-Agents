# Changelog

## [Unreleased]

## [2026-06-12]

### Changes
- feat: Add brightness-based visibility and skin color for remote players  - GameCanvas: remote players now use brightness-based visibility system - Network: sync skin color between players 

### Stats
 components/GameCanvas.tsx | 318 +++++++++++++++++++++++++++++-----------------  network.ts                |   3 +  2 files changed, 202 insertions(+), 119 deletions(-)

## [2026-06-12]

### Changes
- feat: Add shield system and configurable room max players
  - Multiplayer: support custom max players per room (2-16)
  - 1v1 mode auto-sets max players to 2
  - Server: room-full rejection logic
  - GameCanvas: render riot shield with durability
  - Network: sync currentWeaponIndex, shield durability
  - Lobby: UI for selecting room size

### Stats
  App.tsx                          |  4 ++--
  components/GameCanvas.tsx       | 53 +++++++++++++++++++++++++++++++---
  components/MultiplayerLobby.tsx | 41 +++++++++++++++++++++++++++
  network.ts                       | 22 +++++++++++++--
  server.ts                        | 37 +++++++++++++++++++++++---
  5 files changed, 137 insertions(+), 20 deletions(-)
