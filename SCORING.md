# Scoring Rules

## General Rules
- Scores are awarded for eliminating enemies and completing missions.
- Different enemy types and actions award different point values.

## Detailed Scoring

### Kills
- **Standard Kill**: Awards `SCORE_PER_KILL` points.
- **Multi-Kill**: No specific bonus, but rapid kills accumulate score quickly.
- **Kill Condition**: Points are ONLY awarded when an enemy's health is reduced to zero or below from a positive value.

### Damage
- **Hit Score**: Hitting a remote player (Multiplayer) awards points based on damage (damage / 10).
- **Condition**: Damage scores are ONLY awarded for hits on **LIVING** targets. Attacks on corpses or already eliminated players do NOT award points.

### Multiplayer
- Scores in multiplayer are tracked separately from single-player campaign scores.
- Hitting remote players awards points only if they are alive.

### Valid Targets
- **Living Enemies**: Valid for scoring.
- **Living Remote Players**: Valid for scoring.
- **Corpses / Dead Units**: INVALID for scoring. Attacks on these units produce visual effects but NO score.

## Recent Changes
- Fixed an issue where attacking dead bodies in multiplayer could award points.
- Fixed an issue where Explosive Kunai kills did not award kill score.
- Unified scoring logic to ensure consistency across all game modes.
