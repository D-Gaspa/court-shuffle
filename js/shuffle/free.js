/**
 * Free-mode round generation — backtracking team assignment with no-repeat constraint.
 */

import { computeCapacities, DEFAULT_MAX_ATTEMPTS, extractPairs, pairKey, shuffleArray } from "./core.js"

const SEQUENCE_MAX_ITER = 50
const SEQUENCE_NO_IMPROVE_LIMIT = 15

/**
 * Recursive backtracking to place players into teams
 * respecting capacity and pair constraints.
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
 * Generate the optimal (maximum-length) sequence of rounds.
 * Stops early once no improvement is found for several iterations.
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
 * Wrap the output of generateOptimalRoundSequence into the Round[] format.
 */
function wrapFreeRounds(rawRounds) {
    return rawRounds.map((teams) => ({
        matches: [{ court: 1, teams }],
        sitOuts: [],
        scores: null,
    }))
}

export { generateRound, generateOptimalRoundSequence, wrapFreeRounds }
