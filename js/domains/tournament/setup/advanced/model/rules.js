function isBracketFormat(tournamentFormat) {
    return tournamentFormat !== "round-robin"
}

function requiresForcedSitOut({ tournamentTeamSize, allowNotStrictDoubles, selectedPlayers, minRequiredSitOutPool }) {
    return (
        tournamentTeamSize === 2 &&
        !allowNotStrictDoubles &&
        selectedPlayers.length >= minRequiredSitOutPool &&
        selectedPlayers.length % 2 !== 0
    )
}

export { isBracketFormat, requiresForcedSitOut }
