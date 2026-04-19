function nextPowerOf2(value) {
    let next = 1
    while (next < value) {
        next *= 2
    }
    return next
}

function requiresManualSitOutExclusion({
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
    forcedSitOutPlayer,
}) {
    return (
        tournamentTeamSize === 2 &&
        !allowNotStrictDoubles &&
        Array.isArray(selectedPlayers) &&
        selectedPlayers.length >= minRequiredSitOutPool &&
        selectedPlayers.length % 2 !== 0 &&
        typeof forcedSitOutPlayer === "string" &&
        forcedSitOutPlayer.length > 0 &&
        selectedPlayers.includes(forcedSitOutPlayer)
    )
}

function getAdvancedEntrants({
    selectedPlayers,
    tournamentTeamSize,
    allowNotStrictDoubles,
    minRequiredSitOutPool,
    forcedSitOutPlayer = null,
}) {
    const players = Array.isArray(selectedPlayers) ? [...selectedPlayers] : []
    if (
        !requiresManualSitOutExclusion({
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers: players,
            minRequiredSitOutPool,
            forcedSitOutPlayer,
        })
    ) {
        return players
    }
    return players.filter((player) => player !== forcedSitOutPlayer)
}

function getRoundOneTeamCount({ selectedPlayers, tournamentTeamSize, allowNotStrictDoubles, minRequiredSitOutPool }) {
    const playerCount = Array.isArray(selectedPlayers) ? selectedPlayers.length : 0
    let entrants = playerCount
    if (
        tournamentTeamSize === 2 &&
        !allowNotStrictDoubles &&
        playerCount >= minRequiredSitOutPool &&
        playerCount % 2 !== 0
    ) {
        entrants -= 1
    }
    if (entrants < tournamentTeamSize * 2) {
        return 0
    }
    return tournamentTeamSize === 1 ? entrants : Math.ceil(entrants / 2)
}

function getRoundOneQueueMatchCount({
    selectedPlayers,
    tournamentTeamSize,
    tournamentFormat,
    allowNotStrictDoubles,
    minRequiredSitOutPool,
    courtCount,
}) {
    const teamCount = getRoundOneTeamCount({
        selectedPlayers,
        tournamentTeamSize,
        allowNotStrictDoubles,
        minRequiredSitOutPool,
    })
    if (teamCount <= 1) {
        return 0
    }

    let matchCount = 0
    if (tournamentFormat === "round-robin") {
        matchCount = Math.floor(teamCount / 2)
    } else {
        const byeCount = nextPowerOf2(teamCount) - teamCount
        matchCount = (teamCount - byeCount) / 2
    }

    return Math.max(0, matchCount - Math.max(1, courtCount || 1))
}

function getRoundOneQueueTeamSlotCount(context) {
    return getRoundOneQueueMatchCount(context) * 2
}

export { getAdvancedEntrants, getRoundOneQueueMatchCount, getRoundOneQueueTeamSlotCount, getRoundOneTeamCount }
