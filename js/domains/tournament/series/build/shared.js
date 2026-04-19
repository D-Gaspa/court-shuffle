import { shuffleWithRng } from "../../../../platform/random/index.js"
import { computeCapacities, pairKey } from "../../../shuffle/core.js"
import {
    createInitialBracket,
    generateBracketFirstRound,
    generateRoundRobinSchedule,
} from "../../engine/bracket-factory.js"
import { attachTournamentCourtSchedule } from "../../engine/courts.js"
import { normalizeTeamKey } from "./team-utils.js"

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
        doublesRestrictedTeams: (advanced?.doublesRestrictedTeams || []).map((pair) => [
            pair?.[0] || "",
            pair?.[1] || "",
        ]),
        forcedSitOutPlayer: advanced?.forcedSitOutPlayer || null,
        singlesByePlayers: [...(advanced?.singlesByePlayers || [])],
        doublesByeTeams: (advanced?.doublesByeTeams || []).map((team) =>
            Array.isArray(team) ? team.filter((player) => typeof player === "string") : [],
        ),
        singlesNextUpPlayers: [...(advanced?.singlesNextUpPlayers || [])],
        doublesNextUpTeams: (advanced?.doublesNextUpTeams || []).map((team) =>
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
        attachTournamentCourtSchedule(round, courtCount)
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
        bracket: createInitialBracket(),
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

function markDoublesTeamKeysFromTeams(teams, usedTeamKeys) {
    for (const team of teams) {
        usedTeamKeys.add(normalizeTeamKey(team.players))
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

function canJoinDoublesBucket({ player, bucket, capacity, usedPartnerPairs, usedTeamKeys, restrictedTeamKeys }) {
    if (bucket.length >= capacity) {
        return false
    }
    const nextBucket = [...bucket, player]
    for (const mate of bucket) {
        if (usedPartnerPairs.has(pairKey(player, mate))) {
            return false
        }
    }
    if (nextBucket.length === capacity) {
        const nextTeamKey = normalizeTeamKey(nextBucket)
        if (usedTeamKeys.has(nextTeamKey) || restrictedTeamKeys.has(nextTeamKey)) {
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
        let bestCap = Number.POSITIVE_INFINITY
        for (let i = 0; i < capacities.length; i += 1) {
            if (usedIndexes.has(i)) {
                continue
            }
            const cap = capacities[i]
            if (cap >= bucket.length && cap < bestCap) {
                assigned = i
                bestCap = cap
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

function hasUsedSeededTeam(seededBuckets, capacities, usedTeamKeys) {
    for (let i = 0; i < seededBuckets.length; i += 1) {
        const bucket = seededBuckets[i]
        if (bucket.length !== capacities[i]) {
            continue
        }
        if (usedTeamKeys.has(normalizeTeamKey(bucket))) {
            return true
        }
    }
    return false
}

function hasRestrictedSeededTeam(seededBuckets, capacities, restrictedTeamKeys) {
    for (let i = 0; i < seededBuckets.length; i += 1) {
        const bucket = seededBuckets[i]
        if (bucket.length !== capacities[i]) {
            continue
        }
        if (restrictedTeamKeys.has(normalizeTeamKey(bucket))) {
            return true
        }
    }
    return false
}

function buildDoublesTeamPartition({
    players,
    usedPartnerPairs,
    usedTeamKeys,
    restrictedTeamKeys = new Set(),
    rng,
    seedBuckets = [],
}) {
    const teamCount = Math.ceil(players.length / 2)
    const capacities = computeCapacities(players.length, teamCount)
    const seededBuckets = allocateSeedBuckets(seedBuckets, capacities)
    if (!seededBuckets) {
        return null
    }
    if (hasUsedSeededTeam(seededBuckets, capacities, usedTeamKeys)) {
        return null
    }
    if (hasRestrictedSeededTeam(seededBuckets, capacities, restrictedTeamKeys)) {
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
            if (
                !canJoinDoublesBucket({
                    player,
                    bucket: buckets[teamIndex],
                    capacity: capacities[teamIndex],
                    usedPartnerPairs,
                    usedTeamKeys,
                    restrictedTeamKeys,
                })
            ) {
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

export {
    SERIES_BUILD_ATTEMPTS,
    buildDoublesTeamPartition,
    buildTournamentRunFromTeams,
    chooseTournamentSitOut,
    extractOpeningSinglesMatchupKeys,
    makeTeamObject,
    markDoublesTeamKeysFromTeams,
    markPartnerPairsFromTeams,
    normalizeAdvancedSettings,
}
