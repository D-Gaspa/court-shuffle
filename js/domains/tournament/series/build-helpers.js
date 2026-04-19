function buildSeriesRun({
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
    buildSinglesTournament,
    buildDoublesTournament,
}) {
    if (teamSize === 1) {
        return buildSinglesTournament({
            players,
            format,
            usedSinglesOpeningMatchups,
            courtCount,
            rng,
        })
    }
    return buildDoublesTournament({
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

function buildTournamentSeriesResult({
    tournaments,
    teamSize,
    format,
    courtCount,
    courtHandling,
    allowNotStrictDoubles,
    seed,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    usedSinglesOpeningMatchups,
    sitOutCounts,
}) {
    return {
        matchType: teamSize === 1 ? "singles" : "doubles",
        format,
        courtCount,
        courtHandling,
        allowNotStrictDoubles: Boolean(allowNotStrictDoubles && teamSize === 2),
        seed,
        maxTournaments: tournaments.length,
        currentTournamentIndex: 0,
        tournaments,
        constraints: {
            usedDoublesPartnerPairs: [...usedDoublesPartnerPairs],
            usedDoublesTeamKeys: [...usedDoublesTeamKeys],
            usedSinglesOpeningMatchups: [...usedSinglesOpeningMatchups],
            tournamentSitOutCounts: sitOutCounts,
        },
    }
}

export { buildSeriesRun, buildTournamentSeriesResult }
