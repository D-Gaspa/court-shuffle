import { buildFreeSession, buildTournamentSession } from "./start.js"

function buildSelectedSession({ players, gameMode, teamCount, courtCount, allowNotStrict }) {
    if (players.length < 2) {
        return null
    }

    if (gameMode === "tournament") {
        return buildTournamentSession({
            players,
            allowNotStrict,
            courtCount,
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
