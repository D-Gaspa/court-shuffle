const ELO_SCALE = 400

function calculateExpectedScore(ownRating, opponentRating) {
    return 1 / (1 + 10 ** ((opponentRating - ownRating) / ELO_SCALE))
}

function selectPlayerK(player, tuning) {
    return player.ratedMatchCount < tuning.provisionalMatchThreshold ? tuning.provisionalK : tuning.establishedK
}

function calculateSinglesDelta({ playerRating, opponentRating, didWin, player, tuning }) {
    const expected = calculateExpectedScore(playerRating, opponentRating)
    const actual = didWin ? 1 : 0
    return Math.round(selectPlayerK(player, tuning) * (actual - expected))
}

function calculateDoublesDelta({ teamRating, opponentTeamRating, didWin, teamPlayers, tuning }) {
    const expected = calculateExpectedScore(teamRating, opponentTeamRating)
    const actual = didWin ? 1 : 0
    const k = Math.max(...teamPlayers.map((player) => selectPlayerK(player, tuning)))
    return Math.round(k * (actual - expected))
}

export { calculateDoublesDelta, calculateExpectedScore, calculateSinglesDelta, selectPlayerK }
