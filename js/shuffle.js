/**
 * Team shuffling engine with no-repeat-partner constraint.
 *
 * Given a list of players, a team count, and a set of already-used partner pairs,
 * generates a new team assignment where no two players who have already been
 * teammates are placed on the same team again.
 */

const DEFAULT_MAX_ATTEMPTS = 200
const QUICK_CHECK_ATTEMPTS = 50

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
 * Check if at least one more valid round is possible.
 */
function canGenerateMore(players, teamCount, usedPairs) {
    return generateRound(players, teamCount, usedPairs, QUICK_CHECK_ATTEMPTS) !== null
}

export { pairKey, extractPairs, generateRound, canGenerateMore }
