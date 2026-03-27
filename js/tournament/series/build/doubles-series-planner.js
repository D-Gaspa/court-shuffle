import { shuffleWithRng } from "../../../core/random.js"
import { buildFirstRunTournament } from "./doubles.js"
import { buildDoublesSeriesCandidates } from "./doubles-series-candidates.js"
import { buildDoublesSeriesPlan } from "./doubles-series-search.js"
import { getDoublesPartitionError } from "./doubles-team-validation.js"
import {
    buildTournamentRunFromTeams,
    makeTeamObject,
    markDoublesTeamKeysFromTeams,
    markPartnerPairsFromTeams,
} from "./shared.js"

function createTeamsFromPartition(partition, rng) {
    let teams = partition.map((teamPlayers, index) => makeTeamObject(teamPlayers, index))
    teams = shuffleWithRng(teams, rng).map((team, index) => ({ ...team, id: index }))
    return teams
}

function incrementSitOutCounts(candidate, sitOutCounts) {
    if (!candidate.sitOutPlayer) {
        return
    }
    sitOutCounts[candidate.sitOutPlayer] = (sitOutCounts[candidate.sitOutPlayer] || 0) + 1
}

function buildLaterRun({ candidate, format, courtCount, usedDoublesPartnerPairs, usedDoublesTeamKeys, rng }) {
    const teams = createTeamsFromPartition(candidate.partition, rng)
    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants: candidate.entrants,
        tournamentLevelSitOuts: candidate.tournamentLevelSitOuts,
        courtCount,
    })
    markDoublesTeamKeysFromTeams(teams, usedDoublesTeamKeys)
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return run
}

function buildPartitionFailure(firstRunState) {
    return getDoublesPartitionError(
        firstRunState.partitionErrorState?.validLockedPairs || [],
        firstRunState.partitionErrorState?.restrictedTeamKeys || new Set(),
    )
}

function buildSeriesPlanState({ players, allowNotStrictDoubles, advanced, sitOutCounts, rng }) {
    const firstRunState = buildDoublesSeriesCandidates({
        players,
        allowNotStrictDoubles,
        advanced,
    })
    if (firstRunState.errors.length > 0 && firstRunState.firstCandidates.length === 0) {
        return { plan: null, firstRunState, errors: firstRunState.errors }
    }
    if (firstRunState.firstCandidates.length === 0) {
        return { plan: null, firstRunState, errors: [buildPartitionFailure(firstRunState)] }
    }

    const teamsPerRound = firstRunState.firstCandidates[0]?.teamKeys.length
    const plan = buildDoublesSeriesPlan({
        firstCandidates: firstRunState.firstCandidates,
        allCandidates: firstRunState.allCandidates,
        sitOutCounts,
        rng,
        teamsPerRound: teamsPerRound > 0 ? teamsPerRound : Math.ceil(players.length / 2),
    })
    if (plan.length === 0) {
        return { plan: null, firstRunState, errors: [buildPartitionFailure(firstRunState)] }
    }

    return { plan, firstRunState, errors: [] }
}

function buildFirstRun({ candidate, firstRunState, format, allowNotStrictDoubles, courtCount, usedSets, rng }) {
    const teams = createTeamsFromPartition(candidate.partition, rng)
    return buildFirstRunTournament({
        format,
        teams,
        normalizedAdvanced: firstRunState.normalizedAdvanced,
        allowNotStrictDoubles,
        entrantsSet: new Set(candidate.entrants),
        errors: [],
        rng,
        entrants: candidate.entrants,
        tournamentLevelSitOuts: candidate.tournamentLevelSitOuts,
        courtCount,
        usedDoublesPartnerPairs: usedSets.usedDoublesPartnerPairs,
        usedDoublesTeamKeys: usedSets.usedDoublesTeamKeys,
    })
}

function materializePlan({
    plan,
    firstRunState,
    format,
    allowNotStrictDoubles,
    sitOutCounts,
    courtCount,
    usedSets,
    rng,
}) {
    const runs = []
    for (let index = 0; index < plan.length; index += 1) {
        const candidate = plan[index]
        incrementSitOutCounts(candidate, sitOutCounts)
        if (index === 0) {
            const result = buildFirstRun({
                candidate,
                firstRunState,
                format,
                allowNotStrictDoubles,
                courtCount,
                usedSets,
                rng,
            })
            if (!result.run) {
                return { runs: null, errors: result.errors }
            }
            runs.push(result.run)
            continue
        }
        runs.push(
            buildLaterRun({
                candidate,
                format,
                courtCount,
                usedDoublesPartnerPairs: usedSets.usedDoublesPartnerPairs,
                usedDoublesTeamKeys: usedSets.usedDoublesTeamKeys,
                rng,
            }),
        )
    }
    return { runs, errors: [] }
}

function buildOptimizedDoublesSeriesRuns({
    players,
    format,
    allowNotStrictDoubles,
    advanced,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    sitOutCounts,
    courtCount,
    rng,
}) {
    const seriesPlanState = buildSeriesPlanState({
        players,
        allowNotStrictDoubles,
        advanced,
        sitOutCounts,
        rng,
    })
    if (!seriesPlanState.plan) {
        return { runs: null, errors: seriesPlanState.errors }
    }
    return materializePlan({
        plan: seriesPlanState.plan,
        firstRunState: seriesPlanState.firstRunState,
        format,
        allowNotStrictDoubles,
        sitOutCounts,
        courtCount,
        usedSets: {
            usedDoublesPartnerPairs,
            usedDoublesTeamKeys,
        },
        rng,
    })
}

export { buildOptimizedDoublesSeriesRuns }
