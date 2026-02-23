/**
 * Core shuffling utilities — Fisher-Yates, pair tracking, team capacity.
 */

const DEFAULT_MAX_ATTEMPTS = 100
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
 * Build a matchup key for deduplication.
 */
function matchupKey(teams, mode) {
    if (mode === "singles") {
        return pairKey(teams[0][0], teams[1][0])
    }
    return [[...teams[0]].sort().join(","), [...teams[1]].sort().join(",")].sort().join("||")
}

/**
 * Compute team capacities for N players split into K teams.
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
 * Select active players for a round using fair sit-out rotation.
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

export { DEFAULT_MAX_ATTEMPTS, shuffleArray, pairKey, extractPairs, matchupKey, computeCapacities, selectActivePlayers }
