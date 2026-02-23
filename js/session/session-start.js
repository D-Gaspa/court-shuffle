/**
 * Session creation — builds session objects for free and tournament modes.
 */

import { ID_RADIX, ID_SLICE_END, ID_SLICE_START } from "../constants.js"
import { generateOptimalRoundSequence, wrapFreeRounds } from "../shuffle/free.js"
import { generateStructuredRounds } from "../shuffle/structured.js"
import { createInitialBracket, generateBracketFirstRound, generateRoundRobinSchedule } from "../tournament/engine.js"
import { getTournamentConfig } from "../tournament/setup.js"

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
function buildTournamentSession(players, allowNotStrict) {
    const config = getTournamentConfig(players, allowNotStrict)
    if (config.teams.length < 2) {
        return null
    }

    let rounds
    let allRoundsGenerated = false

    if (config.format === "round-robin") {
        rounds = generateRoundRobinSchedule(config.teams)
        allRoundsGenerated = true
    } else {
        const firstRound = generateBracketFirstRound(config.teams)
        rounds = [firstRound]
    }

    if (rounds.length === 0) {
        return null
    }

    return {
        id: generateSessionId(),
        date: new Date().toISOString(),
        players,
        teamCount: 2,
        mode: "tournament",
        courtCount: 1,
        rounds,
        currentRound: 0,
        tournamentFormat: config.format,
        tournamentTeamSize: config.teamSize,
        teams: config.teams,
        seeding: config.seeding,
        bracket: createInitialBracket(config.format),
        tournamentRound: 0,
        allRoundsGenerated,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
    }
}

export { buildFreeSession, buildTournamentSession }
