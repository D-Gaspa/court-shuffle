function startSelectedSession({
    selectedPlayers,
    gameMode,
    tournamentPreview,
    tournamentBuildConfig,
    buildSelectedSession,
    teamCount,
    getCourtCount,
    getNotStrictDoubles,
    onSessionStart,
}) {
    const players = [...selectedPlayers]
    if (gameMode === "tournament" && !(tournamentPreview?.ok && tournamentBuildConfig)) {
        return
    }

    const session = buildSelectedSession({
        players,
        gameMode,
        teamCount,
        courtCount: getCourtCount(),
        allowNotStrict: getNotStrictDoubles(),
        tournamentConfig: tournamentBuildConfig,
    })
    if (!session) {
        return
    }
    onSessionStart(session)
}

function createStartSessionHandler({
    getSelectedPlayers,
    getGameMode,
    getTournamentPreview,
    getTournamentBuildConfig,
    buildSelectedSession,
    getTeamCount,
    getCourtCount,
    getNotStrictDoubles,
    onSessionStart,
}) {
    return () =>
        startSelectedSession({
            selectedPlayers: getSelectedPlayers(),
            gameMode: getGameMode(),
            tournamentPreview: getTournamentPreview(),
            tournamentBuildConfig: getTournamentBuildConfig(),
            buildSelectedSession,
            teamCount: getTeamCount(),
            getCourtCount,
            getNotStrictDoubles,
            onSessionStart,
        })
}

export { createStartSessionHandler, startSelectedSession }
