import { shuffleWithRng } from "../../../core/random.js"

const EXACT_SERIES_CANDIDATE_LIMIT = 1200
const FALLBACK_SERIES_ATTEMPTS = 512

function sortTeamKeys(teamKeys) {
    return [...teamKeys].sort((a, b) => a.localeCompare(b))
}

function canUseCandidate(candidate, usedTeamKeys) {
    return candidate.teamKeys.every((teamKey) => !usedTeamKeys.has(teamKey))
}

function buildUsedStateKey(usedTeamKeys) {
    return sortTeamKeys(usedTeamKeys).join("::")
}

function addCandidateToUsedTeamKeys(usedTeamKeys, candidate) {
    const nextUsedTeamKeys = new Set(usedTeamKeys)
    for (const teamKey of candidate.teamKeys) {
        nextUsedTeamKeys.add(teamKey)
    }
    return nextUsedTeamKeys
}

function getSitOutPriority(candidate, sitOutCounts) {
    if (!(candidate.sitOutPlayer && sitOutCounts)) {
        return 0
    }
    return sitOutCounts[candidate.sitOutPlayer] || 0
}

function orderCandidates(candidates, sitOutCounts, rng) {
    const randomized = shuffleWithRng(candidates, rng)
    randomized.sort((a, b) => {
        const diff = getSitOutPriority(a, sitOutCounts) - getSitOutPriority(b, sitOutCounts)
        if (diff !== 0) {
            return diff
        }
        return (a.order || 0) - (b.order || 0)
    })
    return randomized
}

function assignCandidateOrder(candidates, rng) {
    return shuffleWithRng(candidates, rng).map((candidate, index) => ({
        ...candidate,
        order: index,
    }))
}

function createExactSolver({ candidates, teamsPerRound, totalTeamCount }) {
    const memo = new Map()

    function bestAdditionalRounds(usedTeamKeys) {
        const stateKey = buildUsedStateKey(usedTeamKeys)
        if (memo.has(stateKey)) {
            return memo.get(stateKey)
        }

        const usedCount = usedTeamKeys.size
        const remainingUpperBound = Math.floor((totalTeamCount - usedCount) / teamsPerRound)
        if (remainingUpperBound <= 0) {
            memo.set(stateKey, 0)
            return 0
        }

        let best = 0
        for (const candidate of candidates) {
            if (!canUseCandidate(candidate, usedTeamKeys)) {
                continue
            }
            const nextUsedTeamKeys = addCandidateToUsedTeamKeys(usedTeamKeys, candidate)
            const candidateLength = 1 + bestAdditionalRounds(nextUsedTeamKeys)
            if (candidateLength > best) {
                best = candidateLength
            }
            if (best >= remainingUpperBound) {
                break
            }
        }

        memo.set(stateKey, best)
        return best
    }

    return { bestAdditionalRounds }
}

function updateSitOutCounts(candidate, sitOutCounts) {
    if (!candidate.sitOutPlayer) {
        return { ...sitOutCounts }
    }
    return {
        ...sitOutCounts,
        [candidate.sitOutPlayer]: (sitOutCounts[candidate.sitOutPlayer] || 0) + 1,
    }
}

function collectBestFirstCandidates({ firstCandidates, sitOutCounts, rng, solver }) {
    const orderedFirstCandidates = orderCandidates(firstCandidates, sitOutCounts, rng)
    const bestCandidates = []
    let bestLength = 0

    for (const candidate of orderedFirstCandidates) {
        const candidateLength = 1 + solver.bestAdditionalRounds(new Set(candidate.teamKeys))
        if (candidateLength > bestLength) {
            bestLength = candidateLength
            bestCandidates.length = 0
            bestCandidates.push(candidate)
            continue
        }
        if (candidateLength === bestLength) {
            bestCandidates.push(candidate)
        }
    }

    return { bestCandidates, bestLength }
}

function selectNextExactCandidate({ candidatePool, usedTeamKeys, sitOutCounts, rng, solver, remainingLength }) {
    const orderedCandidates = orderCandidates(candidatePool, sitOutCounts, rng)
    for (const candidate of orderedCandidates) {
        if (!canUseCandidate(candidate, usedTeamKeys)) {
            continue
        }
        const nextUsedTeamKeys = addCandidateToUsedTeamKeys(usedTeamKeys, candidate)
        const candidateLength = 1 + solver.bestAdditionalRounds(nextUsedTeamKeys)
        if (candidateLength === remainingLength) {
            return candidate
        }
    }
    return null
}

function buildExactSeriesPlan({ firstCandidates, allCandidates, sitOutCounts, rng, teamsPerRound }) {
    const totalTeamCount = new Set(allCandidates.flatMap((candidate) => candidate.teamKeys)).size
    const solver = createExactSolver({
        candidates: allCandidates,
        teamsPerRound,
        totalTeamCount,
    })
    const { bestCandidates, bestLength } = collectBestFirstCandidates({
        firstCandidates,
        sitOutCounts,
        rng,
        solver,
    })
    if (bestLength === 0 || bestCandidates.length === 0) {
        return []
    }

    const plan = []
    let usedTeamKeys = new Set()
    let currentSitOutCounts = { ...sitOutCounts }
    let remainingLength = bestLength
    let candidatePool = bestCandidates

    while (remainingLength > 0) {
        const selectedCandidate = selectNextExactCandidate({
            candidatePool,
            usedTeamKeys,
            sitOutCounts: currentSitOutCounts,
            rng,
            solver,
            remainingLength,
        })
        if (!selectedCandidate) {
            break
        }

        plan.push(selectedCandidate)
        usedTeamKeys = addCandidateToUsedTeamKeys(usedTeamKeys, selectedCandidate)
        currentSitOutCounts = updateSitOutCounts(selectedCandidate, currentSitOutCounts)
        remainingLength -= 1
        candidatePool = allCandidates
    }

    return plan
}

function buildGreedySeriesFromFirstCandidate({ firstCandidate, allCandidates, sitOutCounts, rng }) {
    const plan = [firstCandidate]
    let usedTeamKeys = new Set(firstCandidate.teamKeys)
    let currentSitOutCounts = updateSitOutCounts(firstCandidate, sitOutCounts)

    for (;;) {
        const compatibleCandidates = allCandidates.filter((candidate) => canUseCandidate(candidate, usedTeamKeys))
        if (compatibleCandidates.length === 0) {
            break
        }

        const [selectedCandidate] = orderCandidates(compatibleCandidates, currentSitOutCounts, rng)
        if (!selectedCandidate) {
            break
        }

        plan.push(selectedCandidate)
        usedTeamKeys = addCandidateToUsedTeamKeys(usedTeamKeys, selectedCandidate)
        currentSitOutCounts = updateSitOutCounts(selectedCandidate, currentSitOutCounts)
    }

    return plan
}

function buildFallbackSeriesPlan({ firstCandidates, allCandidates, sitOutCounts, rng }) {
    let bestPlan = []
    const orderedFirstCandidates = orderCandidates(firstCandidates, sitOutCounts, rng)

    for (let attempt = 0; attempt < FALLBACK_SERIES_ATTEMPTS; attempt += 1) {
        const firstCandidate = orderedFirstCandidates[attempt % orderedFirstCandidates.length]
        if (!firstCandidate) {
            break
        }
        const plan = buildGreedySeriesFromFirstCandidate({
            firstCandidate,
            allCandidates,
            sitOutCounts,
            rng,
        })
        if (plan.length > bestPlan.length) {
            bestPlan = plan
        }
    }

    return bestPlan
}

function buildDoublesSeriesPlan({ firstCandidates, allCandidates, sitOutCounts, rng, teamsPerRound }) {
    const orderedAllCandidates = assignCandidateOrder(allCandidates, rng)
    const orderedFirstCandidates = firstCandidates.map((candidate) => {
        const match = orderedAllCandidates.find(
            (current) =>
                current.sitOutPlayer === candidate.sitOutPlayer &&
                current.teamKeys.join("::") === candidate.teamKeys.join("::"),
        )
        return match || candidate
    })

    if (orderedAllCandidates.length <= EXACT_SERIES_CANDIDATE_LIMIT) {
        return buildExactSeriesPlan({
            firstCandidates: orderedFirstCandidates,
            allCandidates: orderedAllCandidates,
            sitOutCounts,
            rng,
            teamsPerRound,
        })
    }

    return buildFallbackSeriesPlan({
        firstCandidates: orderedFirstCandidates,
        allCandidates: orderedAllCandidates,
        sitOutCounts,
        rng,
    })
}

export { buildDoublesSeriesPlan }
