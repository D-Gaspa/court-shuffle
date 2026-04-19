import { buildFreeSession, buildTournamentSession } from "./start.js"

function buildSelectedSession({ players, gameMode, teamCount, courtCount, allowNotStrict, night, tournamentConfig }) {
    if (players.length < 2) {
        return null
    }

    if (gameMode === "tournament") {
        return buildTournamentSession({
            night,
            players,
            courtCount,
            tournamentConfig,
        })
    }

    return buildFreeSession({
        players,
        teamCount,
        gameMode,
        courtCount,
        allowNotStrict,
    })
}

export { buildSelectedSession }
