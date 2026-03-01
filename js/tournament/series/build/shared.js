import { shuffleWithRng } from "../../../core/random.js"
import { computeCapacities, pairKey } from "../../../shuffle/core.js"
import { attachTournamentCourtSchedule } from "../../courts.js"
import { createInitialBracket, generateBracketFirstRound, generateRoundRobinSchedule } from "../../engine.js"

const SERIES_BUILD_ATTEMPTS = 150
const TEAM_FORM_ATTEMPTS = 120

function makeTeamObject(teamPlayers, id) {
    return {
        id,
        name: teamPlayers.join(" & "),
        players: [...teamPlayers],
    }
}

function normalizeAdvancedSettings(advanced) {
    return {
        singlesOpeningMatchups: (advanced?.singlesOpeningMatchups || []).map((pair) => [
            pair?.[0] || "",
            pair?.[1] || "",
        ]),
        doublesLockedPairs: (advanced?.doublesLockedPairs || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        forcedSitOutPlayer: advanced?.forcedSitOutPlayer || null,
        singlesByePlayers: [...(advanced?.singlesByePlayers || [])],
        doublesByeTeams: (advanced?.doublesByeTeams || []).map((team) =>
            Array.isArray(team) ? team.filter((player) => typeof player === "string") : [],
        ),
    }
}

function buildTournamentRunFromTeams({
    format,
    teamSize,
    teams,
    entrants,
    tournamentLevelSitOuts,
    courtCount,
    courtHandling,
    firstRoundOverride = null,
}) {
    let rounds
    let allRoundsGenerated = false

    if (format === "round-robin") {
        rounds = generateRoundRobinSchedule(teams)
        allRoundsGenerated = true
    } else {
        rounds = [firstRoundOverride || generateBracketFirstRound(teams)]
    }

    for (const round of rounds) {
        attachTournamentCourtSchedule(round, courtCount, courtHandling)
    }

    return {
        players: [...entrants],
        tournamentLevelSitOuts: [...tournamentLevelSitOuts],
        rounds,
        currentRound: 0,
        tournamentComplete: false,
        tournamentFormat: format,
        tournamentTeamSize: teamSize,
        teams,
        seeding: "random",
        bracket: createInitialBracket(format),
        tournamentRound: 0,
        allRoundsGenerated,
    }
}

function extractOpeningSinglesMatchupKeys(run) {
    const [firstRound] = run.rounds
    const keys = []
    if (!firstRound?.matches) {
        return keys
    }
    for (const match of firstRound.matches) {
        if (match.teams.length !== 2) {
            continue
        }
        const a = match.teams[0]?.[0]
        const b = match.teams[1]?.[0]
        if (!(a && b)) {
            continue
        }
        keys.push(pairKey(a, b))
    }
    return keys
}

function markPartnerPairsFromTeams(teams, usedPartnerPairs) {
    for (const team of teams) {
        for (let i = 0; i < team.players.length; i += 1) {
            for (let j = i + 1; j < team.players.length; j += 1) {
                usedPartnerPairs.add(pairKey(team.players[i], team.players[j]))
            }
        }
    }
}

function chooseTournamentSitOut(players, sitOutCounts, rng) {
    const sorted = [...players].sort((a, b) => {
        const diff = (sitOutCounts[a] || 0) - (sitOutCounts[b] || 0)
        if (diff !== 0) {
            return diff
        }
        return a.localeCompare(b)
    })
    const minCount = sitOutCounts[sorted[0]] || 0
    const candidates = sorted.filter((player) => (sitOutCounts[player] || 0) === minCount)
    const selected = candidates[Math.floor(rng() * candidates.length)]
    sitOutCounts[selected] = (sitOutCounts[selected] || 0) + 1
    return selected
}

function canJoinDoublesBucket(player, bucket, capacity, usedPartnerPairs) {
    if (bucket.length >= capacity) {
        return false
    }
    for (const mate of bucket) {
        if (usedPartnerPairs.has(pairKey(player, mate))) {
            return false
        }
    }
    return true
}

function allocateSeedBuckets(seedBuckets, capacities) {
    const usedIndexes = new Set()
    const indexedSeeds = [...seedBuckets].map((bucket) => [...bucket]).sort((a, b) => b.length - a.length)
    const allocated = []

    for (const bucket of indexedSeeds) {
        let assigned = -1
        for (let i = 0; i < capacities.length; i += 1) {
            if (usedIndexes.has(i)) {
                continue
            }
            if (capacities[i] >= bucket.length) {
                assigned = i
                break
            }
        }
        if (assigned === -1) {
            return null
        }
        usedIndexes.add(assigned)
        allocated.push({ idx: assigned, bucket })
    }

    const buckets = Array.from({ length: capacities.length }, () => [])
    for (const entry of allocated) {
        buckets[entry.idx] = entry.bucket
    }
    return buckets
}

function buildDoublesTeamPartition(players, usedPartnerPairs, rng, seedBuckets = []) {
    const teamCount = Math.ceil(players.length / 2)
    const capacities = computeCapacities(players.length, teamCount)
    const seededBuckets = allocateSeedBuckets(seedBuckets, capacities)
    if (!seededBuckets) {
        return null
    }

    const assigned = new Set(seededBuckets.flat())
    const remainingPlayers = players.filter((player) => !assigned.has(player))

    function backtrack(order, idx, buckets) {
        if (idx === order.length) {
            return buckets.map((bucket) => [...bucket])
        }

        const player = order[idx]
        const teamOrder = shuffleWithRng(
            Array.from({ length: teamCount }, (_, i) => i),
            rng,
        )
        for (const teamIndex of teamOrder) {
            if (!canJoinDoublesBucket(player, buckets[teamIndex], capacities[teamIndex], usedPartnerPairs)) {
                continue
            }
            buckets[teamIndex].push(player)
            const result = backtrack(order, idx + 1, buckets)
            if (result) {
                return result
            }
            buckets[teamIndex].pop()
        }
        return null
    }

    for (let attempt = 0; attempt < TEAM_FORM_ATTEMPTS; attempt += 1) {
        const order = shuffleWithRng(remainingPlayers, rng)
        const buckets = seededBuckets.map((bucket) => [...bucket])
        const result = backtrack(order, 0, buckets)
        if (result) {
            return result
        }
    }
    return null
}

function normalizeTeamKey(players) {
    return [...players].sort().join("||")
}

function createBracketFirstRoundWithOverrides({ teams, byeTeamIds, forcedPairTeamIds, rng }) {
    const byeSet = new Set(byeTeamIds)
    const pairedSet = new Set()
    const matches = []
    const teamById = new Map(teams.map((team) => [team.id, team]))

    for (const pair of forcedPairTeamIds) {
        const [leftId, rightId] = pair
        const left = teamById.get(leftId)
        const right = teamById.get(rightId)
        if (!(left && right)) {
            continue
        }
        if (byeSet.has(left.id) || byeSet.has(right.id) || pairedSet.has(left.id) || pairedSet.has(right.id)) {
            continue
        }
        matches.push({
            court: matches.length + 1,
            teams: [left.players, right.players],
            teamIds: [left.id, right.id],
        })
        pairedSet.add(left.id)
        pairedSet.add(right.id)
    }

    const remaining = teams.filter((team) => !(byeSet.has(team.id) || pairedSet.has(team.id)))
    const shuffledRemaining = shuffleWithRng(remaining, rng)
    for (let i = 0; i + 1 < shuffledRemaining.length; i += 2) {
        const left = shuffledRemaining[i]
        const right = shuffledRemaining[i + 1]
        matches.push({
            court: matches.length + 1,
            teams: [left.players, right.players],
            teamIds: [left.id, right.id],
        })
    }

    return {
        matches,
        byes: [...byeSet],
        sitOuts: [],
        scores: null,
        tournamentRoundLabel: "Round 1",
    }
}

function validateKnownPlayers(values, playersSet, label, errors) {
    for (const value of values) {
        if (!playersSet.has(value)) {
            errors.push(`${label}: unknown player "${value}".`)
        }
    }
}

export {
    SERIES_BUILD_ATTEMPTS,
    buildDoublesTeamPartition,
    buildTournamentRunFromTeams,
    chooseTournamentSitOut,
    createBracketFirstRoundWithOverrides,
    extractOpeningSinglesMatchupKeys,
    makeTeamObject,
    markPartnerPairsFromTeams,
    normalizeAdvancedSettings,
    normalizeTeamKey,
    validateKnownPlayers,
}
