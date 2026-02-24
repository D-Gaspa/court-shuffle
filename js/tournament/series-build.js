/**
 * Tournament series precompute (chained mini-tournaments in a single session).
 */

import { createSeededRng, shuffleWithRng } from "../random.js"
import { computeCapacities, pairKey } from "../shuffle/core.js"
import { attachTournamentCourtSchedule } from "./courts.js"
import { createInitialBracket, generateBracketFirstRound, generateRoundRobinSchedule } from "./engine.js"
import { buildSeriesRun, buildTournamentSeriesResult } from "./series-build-helpers.js"

const SERIES_BUILD_ATTEMPTS = 150
const TEAM_FORM_ATTEMPTS = 120

function makeTeamObject(teamPlayers, id) {
    return {
        id,
        name: teamPlayers.join(" & "),
        players: [...teamPlayers],
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
}) {
    let rounds
    let allRoundsGenerated = false

    if (format === "round-robin") {
        rounds = generateRoundRobinSchedule(teams)
        allRoundsGenerated = true
    } else {
        rounds = [generateBracketFirstRound(teams)]
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
    const candidates = sorted.filter((p) => (sitOutCounts[p] || 0) === minCount)
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

function buildDoublesTeamPartition(players, usedPartnerPairs, rng) {
    const teamCount = Math.ceil(players.length / 2)
    const capacities = computeCapacities(players.length, teamCount)

    function backtrack(order, idx, buckets) {
        if (idx === order.length) {
            return buckets.map((b) => [...b])
        }

        const player = order[idx]
        const teamOrder = shuffleWithRng(
            Array.from({ length: teamCount }, (_, i) => i),
            rng,
        )
        for (const t of teamOrder) {
            if (!canJoinDoublesBucket(player, buckets[t], capacities[t], usedPartnerPairs)) {
                continue
            }
            buckets[t].push(player)
            const result = backtrack(order, idx + 1, buckets)
            if (result) {
                return result
            }
            buckets[t].pop()
        }
        return null
    }

    for (let attempt = 0; attempt < TEAM_FORM_ATTEMPTS; attempt += 1) {
        const order = shuffleWithRng(players, rng)
        const buckets = Array.from({ length: teamCount }, () => [])
        const result = backtrack(order, 0, buckets)
        if (result) {
            return result
        }
    }
    return null
}

function buildSinglesTournament({ players, format, usedSinglesOpeningMatchups, courtCount, courtHandling, rng }) {
    for (let attempt = 0; attempt < SERIES_BUILD_ATTEMPTS; attempt += 1) {
        const seededPlayers = shuffleWithRng(players, rng)
        const teams = seededPlayers.map((p, i) => ({ id: i, name: p, players: [p] }))
        const run = buildTournamentRunFromTeams({
            format,
            teamSize: 1,
            teams,
            entrants: players,
            tournamentLevelSitOuts: [],
            courtCount,
            courtHandling,
        })
        const openingKeys = extractOpeningSinglesMatchupKeys(run)
        if (openingKeys.some((k) => usedSinglesOpeningMatchups.has(k))) {
            continue
        }
        for (const key of openingKeys) {
            usedSinglesOpeningMatchups.add(key)
        }
        return run
    }
    return null
}

function buildDoublesTournament({
    players,
    format,
    allowNotStrictDoubles,
    usedDoublesPartnerPairs,
    sitOutCounts,
    courtCount,
    courtHandling,
    rng,
}) {
    const entrants = [...players]
    const tournamentLevelSitOuts = []
    if (!allowNotStrictDoubles && entrants.length % 2 !== 0) {
        const sitOut = chooseTournamentSitOut(entrants, sitOutCounts, rng)
        tournamentLevelSitOuts.push(sitOut)
        const idx = entrants.indexOf(sitOut)
        if (idx !== -1) {
            entrants.splice(idx, 1)
        }
    }

    if (entrants.length < 2) {
        return null
    }

    const partition = buildDoublesTeamPartition(entrants, usedDoublesPartnerPairs, rng)
    if (!partition) {
        return null
    }
    let teams = partition.map((teamPlayers, i) => makeTeamObject(teamPlayers, i))
    teams = shuffleWithRng(teams, rng).map((team, i) => ({ ...team, id: i }))

    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
        courtHandling,
    })
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return run
}

function buildTournamentSeries({ players, format, teamSize, courtCount, courtHandling, allowNotStrictDoubles, seed }) {
    const rng = createSeededRng(seed)
    const usedDoublesPartnerPairs = new Set()
    const usedSinglesOpeningMatchups = new Set()
    const sitOutCounts = Object.fromEntries(players.map((p) => [p, 0]))
    const tournaments = []
    const singleTournamentOnly = teamSize === 1 && format === "round-robin"

    for (;;) {
        const run = buildSeriesRun({
            players,
            format,
            teamSize,
            courtCount,
            courtHandling,
            allowNotStrictDoubles,
            usedDoublesPartnerPairs,
            usedSinglesOpeningMatchups,
            sitOutCounts,
            rng,
            buildSinglesTournament,
            buildDoublesTournament,
        })

        if (!run) {
            break
        }
        run.index = tournaments.length
        tournaments.push(run)
        if (singleTournamentOnly) {
            break
        }
    }

    if (tournaments.length === 0) {
        return null
    }

    return buildTournamentSeriesResult({
        tournaments,
        teamSize,
        format,
        courtCount,
        courtHandling,
        allowNotStrictDoubles,
        seed,
        usedDoublesPartnerPairs,
        usedSinglesOpeningMatchups,
        sitOutCounts,
    })
}

export { buildTournamentSeries }
