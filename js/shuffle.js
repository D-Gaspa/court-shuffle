/**
 * Team shuffling engine with no-repeat-partner constraint.
 *
 * Given a list of players, a team count, and a set of already-used partner pairs,
 * generates a new team assignment where no two players who have already been
 * teammates are placed on the same team again.
 */

const DEFAULT_MAX_ATTEMPTS = 100
const SEQUENCE_MAX_ITER = 50
const SEQUENCE_NO_IMPROVE_LIMIT = 15
const DOUBLES_TEAM_SIZE = 2
const STRUCTURED_MAX_DOUBLES = 50
const STRUCTURED_MIN_ROUNDS = 10
const STRUCTURED_FAIL_LIMIT = 3
const RANDOM_MIDPOINT = 0.5

/**
 * Fisher-Yates shuffle (in-place).
 */
function shuffleArray(arr) {
    let i = arr.length - 1
    while (i > 0) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
        i -= 1
    }
    return arr
}

/**
 * Create a canonical pair key for two player names.
 */
function pairKey(a, b) {
    return a < b ? `${a}||${b}` : `${b}||${a}`
}

/**
 * Extract all partner pairs from a single round's team assignment.
 * @param {string[][]} teams - Array of teams, each team is an array of player names.
 * @returns {Set<string>} Set of pair keys.
 */
function extractPairs(teams) {
    const pairs = new Set()
    for (const team of teams) {
        let i = 0
        while (i < team.length) {
            let j = i + 1
            while (j < team.length) {
                pairs.add(pairKey(team[i], team[j]))
                j += 1
            }
            i += 1
        }
    }
    return pairs
}

/**
 * Compute team capacities for N players split into K teams.
 * Distributes remainder evenly (first R teams get +1).
 */
function computeCapacities(playerCount, teamCount) {
    const base = Math.floor(playerCount / teamCount)
    const remainder = playerCount % teamCount
    const caps = []
    let i = 0
    while (i < teamCount) {
        caps.push(i < remainder ? base + 1 : base)
        i += 1
    }
    return caps
}

/**
 * Recursive backtracking to place players into teams
 * respecting capacity and pair constraints.
 *
 * @param {{ order: string[], idx: number, buckets: string[][], capacities: number[], teamCount: number, usedPairs: Set<string> }} ctx
 */
function backtrack(ctx) {
    if (ctx.idx === ctx.order.length) {
        return ctx.buckets.map((b) => [...b])
    }

    const player = ctx.order[ctx.idx]
    const teamOrder = shuffleArray(Array.from({ length: ctx.teamCount }, (_, i) => i))

    for (const t of teamOrder) {
        if (ctx.buckets[t].length >= ctx.capacities[t]) {
            continue
        }

        let conflict = false
        for (const mate of ctx.buckets[t]) {
            if (ctx.usedPairs.has(pairKey(player, mate))) {
                conflict = true
                break
            }
        }
        if (conflict) {
            continue
        }

        ctx.buckets[t].push(player)
        const result = backtrack({
            ...ctx,
            idx: ctx.idx + 1,
        })
        if (result) {
            return result
        }
        ctx.buckets[t].pop()
    }

    return null
}

/**
 * Generate a single valid team assignment via randomized backtracking.
 *
 * @param {string[]} players - Players to assign.
 * @param {number} teamCount - Number of teams.
 * @param {Set<string>} usedPairs - Pairs that must NOT appear on the same team.
 * @param {number} maxAttempts - Max restarts before giving up.
 * @returns {string[][]|null} Array of teams, or null if impossible.
 */
function generateRound(players, teamCount, usedPairs, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
    const n = players.length
    const capacities = computeCapacities(n, teamCount)

    let attempt = 0
    while (attempt < maxAttempts) {
        const order = shuffleArray([...players])
        const buckets = Array.from({ length: teamCount }, () => [])
        const result = backtrack({ order, idx: 0, buckets, capacities, teamCount, usedPairs })
        if (result) {
            shuffleArray(result)
            return result
        }
        attempt += 1
    }

    return null
}

/**
 * Build one complete sequence of rounds (greedy, randomized).
 */
function buildSequence(players, teamCount, initialUsedPairs = null) {
    const sequence = []
    const usedPairs = new Set(initialUsedPairs)
    let round = generateRound(players, teamCount, usedPairs, DEFAULT_MAX_ATTEMPTS)
    while (round !== null) {
        sequence.push(round)
        for (const p of extractPairs(round)) {
            usedPairs.add(p)
        }
        round = generateRound(players, teamCount, usedPairs, DEFAULT_MAX_ATTEMPTS)
    }
    return sequence
}

/**
 * Generate the optimal (maximum-length) sequence of rounds by running multiple
 * randomised greedy attempts and keeping the best.
 *
 * Stops early once SEQUENCE_NO_IMPROVE_LIMIT consecutive iterations produce no
 * improvement, which in practice means the theoretical maximum has been reached.
 *
 * @param {string[]} players
 * @param {number} teamCount
 * @returns {string[][][]} Array of rounds (each round is an array of teams).
 */
function generateOptimalRoundSequence(players, teamCount, initialUsedPairs = null) {
    let best = []
    let noImprove = 0
    for (let i = 0; i < SEQUENCE_MAX_ITER; i += 1) {
        const seq = buildSequence(players, teamCount, initialUsedPairs)
        if (seq.length > best.length) {
            best = seq
            noImprove = 0
        } else {
            noImprove += 1
            if (noImprove >= SEQUENCE_NO_IMPROVE_LIMIT) {
                break
            }
        }
    }
    return best
}

/**
 * Select active players for a round using fair sit-out rotation.
 * Players who have sat out the most get priority to play.
 */
function selectActivePlayers(players, activeCount, sitOutCounts) {
    const sorted = [...players].sort((a, b) => {
        const diff = sitOutCounts.get(b) - sitOutCounts.get(a)
        if (diff !== 0) {
            return diff
        }
        return Math.random() - RANDOM_MIDPOINT
    })
    const active = sorted.slice(0, activeCount)
    const sitOuts = sorted.slice(activeCount)
    for (const p of sitOuts) {
        sitOutCounts.set(p, sitOutCounts.get(p) + 1)
    }
    return { active, sitOuts }
}

/**
 * Build a matchup key for deduplication.
 */
function matchupKey(teams, mode) {
    if (mode === "singles") {
        return pairKey(teams[0][0], teams[1][0])
    }
    return [[...teams[0]].sort().join(","), [...teams[1]].sort().join(",")].sort().join("||")
}

/**
 * Attempt to assign players to courts, checking matchup uniqueness.
 * Returns a matches array for one shuffle attempt, or null on conflict.
 */
function assignCourts(shuffled, ctx) {
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
 * Try to build valid matches from a set of active players.
 * Returns matches array or null if no valid assignment found.
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
 * Generate structured rounds for singles/doubles modes with sit-out rotation.
 *
 * @param {string[]} players
 * @param {"singles"|"doubles"} mode
 * @param {number} courtCount - Number of courts (matches per round)
 * @returns {{ matches: { court: number, teams: string[][] }[], sitOuts: string[] }[]}
 */
function generateStructuredRounds(players, mode, courtCount, initialUsedMatchups = null) {
    const teamSize = mode === "singles" ? 1 : DOUBLES_TEAM_SIZE
    const playersPerCourt = teamSize * 2
    const activeCount = Math.min(playersPerCourt * courtCount, players.length)
    const sitOutCounts = new Map(players.map((p) => [p, 0]))
    const usedMatchups = new Set(initialUsedMatchups)
    const rounds = []
    const maxRounds = Math.max(computeMaxStructuredRounds(players, mode), STRUCTURED_MIN_ROUNDS)
    const ctx = { teamSize, playersPerCourt, courtCount, mode, usedMatchups }
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
 * Wrap the output of generateOptimalRoundSequence into the Round[] format.
 */
function wrapFreeRounds(rawRounds) {
    return rawRounds.map((teams) => ({
        matches: [{ court: 1, teams }],
        sitOuts: [],
        scores: null,
    }))
}

export {
    pairKey,
    extractPairs,
    matchupKey,
    generateRound,
    generateOptimalRoundSequence,
    generateStructuredRounds,
    wrapFreeRounds,
}
