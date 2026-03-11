/**
 * Tournament series precompute (chained mini-tournaments in a single session).
 */

import { createSeededRng } from "../../core/random.js"
import { buildDoublesFirstRun, buildDoublesTournament } from "./build/doubles.js"
import { SERIES_BUILD_ATTEMPTS } from "./build/shared.js"
import { buildSinglesFirstRun, buildSinglesTournament } from "./build/singles.js"
import { buildSeriesRun, buildTournamentSeriesResult } from "./build-helpers.js"

function createSeriesBuildState(players, seed) {
    return {
        rng: createSeededRng(seed),
        usedDoublesPartnerPairs: new Set(),
        usedDoublesTeamKeys: new Set(),
        usedSinglesOpeningMatchups: new Set(),
        sitOutCounts: Object.fromEntries(players.map((player) => [player, 0])),
    }
}

function buildFirstTournamentRun({
    players,
    format,
    teamSize,
    courtCount,
    allowNotStrictDoubles,
    advanced,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    usedSinglesOpeningMatchups,
    sitOutCounts,
    rng,
}) {
    if (teamSize === 1) {
        return buildSinglesFirstRun({
            players,
            format,
            advanced,
            usedSinglesOpeningMatchups,
            courtCount,
            rng,
        })
    }

    return buildDoublesFirstRun({
        players,
        format,
        allowNotStrictDoubles,
        advanced,
        usedDoublesPartnerPairs,
        usedDoublesTeamKeys,
        sitOutCounts,
        courtCount,
        rng,
    })
}

function buildPreviewDistribution(run, courtCount) {
    const firstRound = run.rounds[0] || { matches: [], byes: [] }
    const matchCount = firstRound.matches?.length || 0
    const onCourtMatches = Math.min(Math.max(1, courtCount || 1), matchCount)
    const nextUpMatches = Math.max(0, matchCount - Math.max(1, courtCount || 1))
    const byeTeams = (firstRound.byes || [])
        .map((teamId) => run.teams.find((team) => team.id === teamId)?.name || null)
        .filter(Boolean)
    return {
        totalMatches: matchCount,
        onCourtMatches,
        nextUpMatches,
        byeTeams,
        sitOutPlayers: [...(run.tournamentLevelSitOuts || [])],
    }
}

function buildTournamentPreview({ players, format, teamSize, courtCount, allowNotStrictDoubles, seed, advanced }) {
    const { rng, usedDoublesPartnerPairs, usedDoublesTeamKeys, usedSinglesOpeningMatchups, sitOutCounts } =
        createSeriesBuildState(players, seed)
    const firstRunResult = buildFirstTournamentRun({
        players,
        format,
        teamSize,
        courtCount,
        allowNotStrictDoubles,
        advanced,
        usedDoublesPartnerPairs,
        usedDoublesTeamKeys,
        usedSinglesOpeningMatchups,
        sitOutCounts,
        rng,
    })

    if (!firstRunResult.run) {
        return {
            ok: false,
            errors:
                firstRunResult.errors.length > 0
                    ? firstRunResult.errors
                    : ["Unable to build a first tournament preview."],
            run: null,
            seed,
        }
    }

    return {
        ok: true,
        errors: [],
        run: firstRunResult.run,
        seed,
        distribution: buildPreviewDistribution(firstRunResult.run, courtCount),
    }
}

function buildSeriesTournaments({ players, format, teamSize, courtCount, allowNotStrictDoubles, advanced, state }) {
    const tournaments = []
    const firstRunResult = buildFirstTournamentRun({
        players,
        format,
        teamSize,
        courtCount,
        allowNotStrictDoubles,
        advanced,
        usedDoublesPartnerPairs: state.usedDoublesPartnerPairs,
        usedDoublesTeamKeys: state.usedDoublesTeamKeys,
        usedSinglesOpeningMatchups: state.usedSinglesOpeningMatchups,
        sitOutCounts: state.sitOutCounts,
        rng: state.rng,
    })
    if (!firstRunResult.run) {
        return null
    }

    firstRunResult.run.index = 0
    tournaments.push(firstRunResult.run)
    if (teamSize === 1 && format === "round-robin") {
        return tournaments
    }
    appendSeriesRuns({
        tournaments,
        players,
        format,
        teamSize,
        courtCount,
        allowNotStrictDoubles,
        state,
    })
    return tournaments
}

function appendSeriesRuns({ tournaments, players, format, teamSize, courtCount, allowNotStrictDoubles, state }) {
    for (;;) {
        const run = buildSeriesRun({
            players,
            format,
            teamSize,
            courtCount,
            allowNotStrictDoubles,
            usedDoublesPartnerPairs: state.usedDoublesPartnerPairs,
            usedDoublesTeamKeys: state.usedDoublesTeamKeys,
            usedSinglesOpeningMatchups: state.usedSinglesOpeningMatchups,
            sitOutCounts: state.sitOutCounts,
            rng: state.rng,
            buildSinglesTournament: (options) =>
                buildSinglesTournament({ ...options, attempts: SERIES_BUILD_ATTEMPTS }),
            buildDoublesTournament,
        })
        if (!run) {
            break
        }
        run.index = tournaments.length
        tournaments.push(run)
    }
}

function buildTournamentSeries({
    players,
    format,
    teamSize,
    courtCount,
    courtHandling,
    allowNotStrictDoubles,
    seed,
    advanced,
}) {
    const state = createSeriesBuildState(players, seed)
    const tournaments = buildSeriesTournaments({
        players,
        format,
        teamSize,
        courtCount,
        allowNotStrictDoubles,
        advanced,
        state,
    })
    if (!(tournaments && tournaments.length > 0)) {
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
        usedDoublesPartnerPairs: state.usedDoublesPartnerPairs,
        usedDoublesTeamKeys: state.usedDoublesTeamKeys,
        usedSinglesOpeningMatchups: state.usedSinglesOpeningMatchups,
        sitOutCounts: state.sitOutCounts,
    })
}

export { buildTournamentPreview, buildTournamentSeries }
