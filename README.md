# Court Shuffle

Court Shuffle is a browser-based tennis session planner for small groups. It helps you build matchups, run rounds, track scores, and save session history locally.

## What It Does

- Manage a reusable player roster
- Start a session from any selected subset of players
- Run free-form shuffled rounds or tournament sessions
- Enter set scores per match
- Navigate rounds and mini-tournaments during a session
- Save finished sessions to local history for later review

## Session Modes

### Free

Flexible team shuffling across rounds. Use this when you just want balanced rotation and quick match generation.

### Tournament

Creates a tournament session made of one or more mini-tournaments in a series.

Tournament configuration includes:

- Format: `Consolation`, `Elimination`, or `Round Robin`
- Match type: `Singles (1v1)` or `Doubles (2v2)`
- Court shortage handling: `Queue` or `Batches`
- Optional doubles flexibility: `Allow 2v1 matchups`

## Tournament Series Behavior

Tournament sessions prebuild a series of mini-tournaments from the selected players.

- You can move between mini-tournaments with dedicated tournament navigation controls
- You can skip a mini-tournament if you do not want to play that shuffle/seeding
- Round navigation stays separate from mini-tournament navigation
- Progress and scores are preserved while browsing between mini-tournaments

### Singles series

- Avoids repeating opening-round matchups across the generated series when possible

### Doubles series

- Teams stay fixed within a mini-tournament
- Partner pairings are not repeated across the same tournament session when possible
- Sit-outs rotate across the series for odd player counts (strict doubles mode)

## Court Shortage Handling (Tournament)

When a round has more matches than available courts:

- `Queue`: only the active matches are shown on court and the rest appear as `Next Up`
- `Batches`: the round is split into sequential batches and advanced batch-by-batch

Tournament progression only advances after the required scores for the current batch/round are entered.

## Data Storage

The app stores roster, active session state, and session history in local browser storage on your device.

## Development

This project is a static HTML/CSS/JavaScript app (no framework required).

### Run locally

Serve the folder with any static file server.

### Format / lint

Biome is used for formatting and lint checks:

```bash
npx biome check --write .
```
