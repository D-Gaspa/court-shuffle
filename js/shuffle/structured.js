/**
 * Structured-mode round generation — singles/doubles with court assignment and sit-out rotation.
 */

import { DEFAULT_MAX_ATTEMPTS, matchupKey, selectActivePlayers, shuffleArray } from "./core.js"

const DOUBLES_TEAM_SIZE = 2
const SINGLES_TEAM_SIZE = 1
const STRUCTURED_MAX_DOUBLES = 50
const STRUCTURED_MIN_ROUNDS = 10
const STRUCTURED_FAIL_LIMIT = 3
const FULL_DOUBLES_COURT = 4
const MIN_2V1_COURT = 3
const DOUBLES_TEAMS_PER_COURT = 2

/**
 * Distribute players for flexible 2v2/2v1 courts (not-strict doubles mode).
 */
function assignNotStrictCourts(shuffled, ctx) {
    const matches = []
    let offset = 0
    for (let c = 0; c < ctx.courtCount; c += 1) {
        const remaining = shuffled.length - offset
        if (remaining < MIN_2V1_COURT) {
            return null
        }
        const courtSize =
            remaining >= FULL_DOUBLES_COURT + (ctx.courtCount - c - 1) * MIN_2V1_COURT
                ? FULL_DOUBLES_COURT
                : MIN_2V1_COURT
        const courtPlayers = shuffled.slice(offset, offset + courtSize)
        offset += courtSize

        const team1 = courtPlayers.slice(0, DOUBLES_TEAM_SIZE)
        const team2 =
            courtSize === FULL_DOUBLES_COURT
                ? courtPlayers.slice(DOUBLES_TEAM_SIZE, FULL_DOUBLES_COURT)
                : courtPlayers.slice(DOUBLES_TEAM_SIZE, MIN_2V1_COURT)

        const key = matchupKey([team1, team2], ctx.mode)
        if (ctx.usedMatchups.has(key)) {
            return null
        }
        matches.push({ court: c + 1, teams: [team1, team2] })
    }
    return matches
}

/**
 * Distribute players for strict court format (each court has exactly the required players).
 */
function assignStrictCourts(shuffled, ctx) {
    const matches = []
    for (let c = 0; c < ctx.courtCount; c += 1) {
        const courtPlayers = shuffled.slice(c * ctx.playersPerCourt, (c + 1) * ctx.playersPerCourt)
        if (courtPlayers.length < ctx.playersPerCourt) {
            return null
        }
        const team1 = courtPlayers.slice(0, ctx.teamSize)
        const team2 = courtPlayers.slice(ctx.teamSize)
        const key = matchupKey([team1, team2], ctx.mode)
        if (ctx.usedMatchups.has(key)) {
            return null
        }
        matches.push({ court: c + 1, teams: [team1, team2] })
    }
    return matches
}

/**
 * Attempt to assign players to courts, checking matchup uniqueness.
 */
function assignCourts(shuffled, ctx) {
    return ctx.allowNotStrict && ctx.mode === "doubles"
        ? assignNotStrictCourts(shuffled, ctx)
        : assignStrictCourts(shuffled, ctx)
}

/**
 * Try to build valid matches from a set of active players.
 */
function tryBuildMatches(active, ctx) {
    for (let attempt = 0; attempt < DEFAULT_MAX_ATTEMPTS; attempt += 1) {
        const shuffled = shuffleArray([...active])
        const matches = assignCourts(shuffled, ctx)
        if (matches) {
            return matches
        }
    }
    return null
}

/**
 * Compute the maximum number of rounds for structured modes.
 */
function computeMaxStructuredRounds(players, mode) {
    const n = players.length
    if (mode === "singles") {
        return (n * (n - 1)) / 2
    }
    return Math.min(STRUCTURED_MAX_DOUBLES, n * (n - 1))
}

/**
 * Attempt to generate a single structured round with sit-out selection.
 */
function tryStructuredRound(players, activeCount, sitOutCounts, ctx) {
    for (let sel = 0; sel < DEFAULT_MAX_ATTEMPTS; sel += 1) {
        const { active, sitOuts } = selectActivePlayers(players, activeCount, sitOutCounts)
        const matches = tryBuildMatches(active, ctx)

        if (matches) {
            for (const match of matches) {
                ctx.usedMatchups.add(matchupKey(match.teams, ctx.mode))
            }
            return { matches, sitOuts, scores: null }
        }

        // Undo sit-out counts for this failed selection
        for (const p of sitOuts) {
            sitOutCounts.set(p, sitOutCounts.get(p) - 1)
        }
    }
    return null
}

/**
 * Generate structured rounds for singles/doubles modes with sit-out rotation.
 */
function generateStructuredRounds(players, mode, courtCount, options = {}) {
    const { initialUsedMatchups = null, allowNotStrict = false } = options
    const teamSize = mode === "singles" ? SINGLES_TEAM_SIZE : DOUBLES_TEAM_SIZE
    const playersPerCourt = teamSize * DOUBLES_TEAMS_PER_COURT
    const minPerCourt = allowNotStrict && mode === "doubles" ? MIN_2V1_COURT : playersPerCourt
    const maxActive = playersPerCourt * courtCount
    const minActive = minPerCourt * courtCount
    const activeCount = Math.min(Math.max(minActive, Math.min(maxActive, players.length)), players.length)
    const sitOutCounts = new Map(players.map((p) => [p, 0]))
    const usedMatchups = new Set(initialUsedMatchups)
    const rounds = []
    const maxRounds = Math.max(computeMaxStructuredRounds(players, mode), STRUCTURED_MIN_ROUNDS)
    const ctx = { teamSize, playersPerCourt, courtCount, mode, usedMatchups, allowNotStrict }
    let consecutiveFails = 0

    for (let r = 0; r < maxRounds; r += 1) {
        const result = tryStructuredRound(players, activeCount, sitOutCounts, ctx)

        if (result) {
            rounds.push(result)
            consecutiveFails = 0
        } else {
            consecutiveFails += 1
            if (consecutiveFails >= STRUCTURED_FAIL_LIMIT) {
                break
            }
        }
    }

    return rounds
}

export { generateStructuredRounds }
