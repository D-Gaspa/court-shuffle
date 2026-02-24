/**
 * Session creation — builds session objects for free and tournament modes.
 */

import { ID_RADIX, ID_SLICE_END, ID_SLICE_START } from "../../core/constants.js"
import { generateOptimalRoundSequence, wrapFreeRounds } from "../../shuffle/free.js"
import { generateStructuredRounds } from "../../shuffle/structured.js"
import { buildTournamentSeries } from "../../tournament/series/build.js"
import { syncTournamentSeriesAliases } from "../../tournament/series/sync.js"
import { getTournamentConfig } from "../../tournament/setup.js"

function generateSessionId() {
    return Date.now().toString(ID_RADIX) + Math.random().toString(ID_RADIX).slice(ID_SLICE_START, ID_SLICE_END)
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
function buildTournamentSession({ players, allowNotStrict, courtCount }) {
    const config = getTournamentConfig(players, allowNotStrict)
    const seed = `${Date.now()}-${players.join("|")}-${config.format}-${config.teamSize}`
    const series = buildTournamentSeries({
        players,
        format: config.format,
        teamSize: config.teamSize,
        courtCount,
        courtHandling: config.courtHandling,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        seed,
    })
    if (!series || series.tournaments.length === 0) {
        return null
    }
    const session = {
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
        tournamentSeries: series,
    }
    syncTournamentSeriesAliases(session)
    return session
}

export { buildFreeSession, buildTournamentSession }
