function buildSeriesRun({
    players,
    format,
    teamSize,
    courtCount,
    allowNotStrictDoubles,
    usedDoublesPartnerPairs,
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
        usedDoublesPartnerPairs,
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
            usedSinglesOpeningMatchups: [...usedSinglesOpeningMatchups],
            tournamentSitOutCounts: sitOutCounts,
        },
    }
}

export { buildSeriesRun, buildTournamentSeriesResult }
