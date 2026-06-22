# Changelog

## [Unreleased]

## [2026-06-22]

### Changes
- Update App, GameCanvas, and level definitions
  - App.tsx: refinements to game app logic
  - GameCanvas.tsx: updates to canvas rendering and game loop
  - levels/level-definitions.ts: level design adjustments

### Stats
- App.tsx: 50 changes (+/-)
- components/GameCanvas.tsx: 25 changes (+/-)
- levels/level-definitions.ts: 24 changes (+/-)
- 3 files changed, 53 insertions(+), 46 deletions(-)

### Changes
- Add team/match features and multiplayer fixes  Introduce team selection, match timer/duration and end-of-match UI; improve multiplayer scoring and player identity handling. Key changes: - App: extend join handler to accept matchDuration and set networkClient ownId/ownName from currentUser. - GameCanvas: track teamScores, matchRemainingMs and matchEnded; add team-select UI, match-ended overlay, match timer display and formatting; show player names in-world and in kill messages; send ownerId for throwables and cookables; add multiplayer hit propagation for shield bash, knife slash, grenades/flashbangs and fire patches; restore shield durability on respawn and ensure riot shield has default durability; attach ownerId to relevant objects. - MultiplayerLobby: add match duration slider and pass duration when creating/joining rooms. - WeaponModificationMenu: implement weapon visual profiles and adaptive slot positioning for various weapon types. - data/definitions.ts: make Throwable.hasBounced required and add optional ownerId. - levels/level-definitions.ts: split server room container wall, add a door and flip one door swing direction for correct opening behavior. - network.ts: widen network event types to include names, team/teamScores, match-timer/match-ended/select-team/team-selection-failed; MockNetworkClient defaults updated and setRoomInfo signature extended. - .server-stats.json: update sample player entries. These changes enhance multiplayer UX (team play, timed matches), improve authoritative scoring/notifications, and add robustness for multiplayer interactions. 

### Stats
 .server-stats.json                    |  24 +--  App.tsx                               |  10 +-  components/GameCanvas.tsx             | 387 ++++++++++++++++++++++++++++------  components/MultiplayerLobby.tsx       |  26 ++-  components/WeaponModificationMenu.tsx | 185 ++++++++++++++--  data/definitions.ts                   |  19 +-  levels/level-definitions.ts           |   8 +-  network.ts                            |  30 ++-  server.ts                             | 260 ++++++++++++++++++-----  9 files changed, 781 insertions(+), 168 deletions(-)

## [2026-06-16]

### Changes
- feat: update game canvas, lobby UI, networking and server logic
- 回退除了联机都完美的版本

### Stats (Latest Commit)
- App.tsx, components/GameCanvas.tsx, components/MainMenu.tsx, components/MultiplayerLobby.tsx, network.ts, server.ts, .server-stats.json
- 7 files changed, 747 insertions(+), 159 deletions(-)

### Stats (Previous Commit)
- App.tsx, README.md, components/GameCanvas.tsx, components/MainMenu.tsx, components/MultiplayerLobby.tsx, network.ts, server.ts
- 8 files changed, 786 insertions(+), 1161 deletions(-)

