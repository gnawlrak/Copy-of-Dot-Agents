# Changelog

## [Unreleased]

## [2026-06-12]

### Changes
- feat: Add brightness-based visibility and skin color for remote players  - GameCanvas: remote players now use brightness-based visibility system - Network: sync skin color between players 

### Stats
 components/GameCanvas.tsx | 318 +++++++++++++++++++++++++++++-----------------  network.ts                |   3 +  2 files changed, 202 insertions(+), 119 deletions(-)
