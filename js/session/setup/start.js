/**
 * Session creation — builds session objects for free and tournament modes.
 */

import { ID_RADIX, ID_SLICE_END, ID_SLICE_START } from "../../core/constants.js"
import { generateOptimalRoundSequence, wrapFreeRounds } from "../../shuffle/free.js"
import { generateStructuredRounds } from "../../shuffle/structured.js"
import { buildTournamentPreview, buildTournamentSeries } from "../../tournament/series/build.js"
import { syncTournamentSeriesAliases } from "../../tournament/series/sync.js"

function generateSessionId() {
    return Date.now().toString(ID_RADIX) + Math.random().toString(ID_RADIX).slice(ID_SLICE_START, ID_SLICE_END)
}

function buildTournamentSessionConfig(config, courtCount, seed) {
    return {
        format: config.format,
        teamSize: config.teamSize,
        courtCount,
        courtHandling: config.courtHandling,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        advanced: config.advanced,
        seed,
    }
}

function buildTournamentSessionState({ players, courtCount, config, seed, series }) {
    return {
        id: generateSessionId(),
        date: new Date().toISOString(),
        players,
        teamCount: 2,
        mode: "tournament",
        courtCount,
        rounds: [],
        currentRound: 0,
        tournamentFormat: config.format,
        tournamentTeamSize: config.teamSize,
        teams: [],
        seeding: "random",
        bracket: null,
        tournamentRound: 0,
        allRoundsGenerated: false,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        tournamentConfig: buildTournamentSessionConfig(config, courtCount, seed),
        tournamentSeries: series,
    }
}

function buildTournamentSessionSeed(players, config) {
    return config.seed || `${Date.now()}-${players.join("|")}-${config.format}-${config.teamSize}`
}

function buildTournamentSessionSeries(players, courtCount, config, seed) {
    const preview = buildTournamentPreview({
        players,
        format: config.format,
        teamSize: config.teamSize,
        courtCount,
        courtHandling: config.courtHandling,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        seed,
        advanced: config.advanced,
    })
    if (!preview.ok) {
        return null
    }

    return buildTournamentSeries({
        players,
        format: config.format,
        teamSize: config.teamSize,
        courtCount,
        courtHandling: config.courtHandling,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        seed,
        advanced: config.advanced,
    })
}

/**
 * Build a free-mode session object, or null if rounds can't be generated.
 */
function buildFreeSession({ players, teamCount, gameMode, courtCount, allowNotStrict }) {
    let rounds
    if (gameMode === "free") {
        const raw = generateOptimalRoundSequence(players, teamCount)
        if (raw.length === 0) {
            return null
        }
        rounds = wrapFreeRounds(raw)
    } else {
        rounds = generateStructuredRounds(players, gameMode, courtCount, { allowNotStrict })
        if (rounds.length === 0) {
            return null
        }
    }

    return {
        id: generateSessionId(),
        date: new Date().toISOString(),
        players,
        teamCount: gameMode === "free" ? teamCount : 2,
        mode: gameMode,
        courtCount: gameMode === "free" ? 1 : courtCount,
        rounds,
        currentRound: 0,
        allowNotStrictDoubles: gameMode === "doubles" ? allowNotStrict : false,
    }
}

/**
 * Build a tournament session object, or null if not enough teams.
 */
function buildTournamentSession({ players, courtCount, tournamentConfig }) {
    const config = tournamentConfig
    if (!config) {
        return null
    }
    const seed = buildTournamentSessionSeed(players, config)
    const series = buildTournamentSessionSeries(players, courtCount, config, seed)
    if (!series || series.tournaments.length === 0) {
        return null
    }
    const session = buildTournamentSessionState({ players, courtCount, config, seed, series })
    syncTournamentSeriesAliases(session)
    return session
}

export { buildFreeSession, buildTournamentSession }
