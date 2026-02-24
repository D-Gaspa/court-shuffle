# Court Shuffle

Court Shuffle is a tennis session manager for building matchups, running sessions, and saving history.

## Session Modes

- `Free`: flexible team shuffling (existing free mode behavior)
- `Tournament`: a chained series of mini-tournaments in one session

Top-level `Singles` and `Doubles` setup modes were removed. In `Tournament`, you now choose match type inside tournament settings:

- `Singles (1v1)`
- `Doubles (2v2)`

## Tournament Series

Tournament mode precomputes a full series of mini-tournaments and shows progress.
You must finish the current mini-tournament before advancing to the next one.

Supported mini-tournament formats:

- `Consolation`
- `Elimination`
- `Round Robin`

### Doubles tournaments

- Teams stay fixed within each mini-tournament
- Across the same tournament session, teammate pairs are not repeated
- The app precomputes as many valid mini-tournaments as possible for a deterministic seed (`X`)

### Singles tournaments

- The app avoids repeating opening-round matchups across mini-tournaments when generating the series

## Court Logic in Tournament Mode

Tournament mode now uses the court count setting.

If a round has more matches than available courts, choose one of:

- `Queue` (default): only up to the court count is active; remaining matches are shown as `Next Up`
- `Batches`: the round is split into sequential batches (for example `Batch 1/2`, `Batch 2/2`)

Bracket / standings progression only happens after the full logical round is completed.

## Doubles Odd-Player Behavior

### Strict doubles (`Allow 2v1` OFF)

- One player sits out for the entire mini-tournament
- Tournament-level sit-outs rotate across the series

### Flexible doubles (`Allow 2v1` ON)

- Odd player counts are allowed
- Some matches may include `2v1`
