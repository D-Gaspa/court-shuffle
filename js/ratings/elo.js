const ELO_SCALE = 400
const DOUBLES_SOLO_STRENGTH_MULTIPLIER = 1.35

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

function calculateRatingDelta({ actual, expected, player, tuning }) {
    return Math.round(selectPlayerK(player, tuning) * (actual - expected))
}

function calculateDoublesDelta({ actual, expected, player, tuning }) {
    return calculateRatingDelta({ actual, expected, player, tuning })
}

function calculateDoublesSideRating({ baselineRating, playerRatings, teamSize }) {
    if (teamSize === 1) {
        const [soloRating = baselineRating] = playerRatings
        return baselineRating * 2 + DOUBLES_SOLO_STRENGTH_MULTIPLIER * (soloRating - baselineRating)
    }
    if (teamSize === 2) {
        return playerRatings.reduce((total, rating) => total + rating, 0)
    }
    return null
}

function calculateDoublesPlayerExpectedScore({
    ownRating,
    ownSideExpected,
    opponentTeamRating,
    ownTeamSize,
    opponentTeamSize,
}) {
    if (ownTeamSize === 1 || opponentTeamSize === 1) {
        return ownSideExpected
    }
    const opponentAverageRating = opponentTeamRating / opponentTeamSize
    const playerExpected = calculateExpectedScore(ownRating, opponentAverageRating)
    return (ownSideExpected + playerExpected) / 2
}

function calculateDoublesSideExpectedScores({ baselineRating, sideOnePlayerRatings, sideTwoPlayerRatings }) {
    const sideOneTeamRating = calculateDoublesSideRating({
        baselineRating,
        playerRatings: sideOnePlayerRatings,
        teamSize: sideOnePlayerRatings.length,
    })
    const sideTwoTeamRating = calculateDoublesSideRating({
        baselineRating,
        playerRatings: sideTwoPlayerRatings,
        teamSize: sideTwoPlayerRatings.length,
    })
    if (!(Number.isFinite(sideOneTeamRating) && Number.isFinite(sideTwoTeamRating))) {
        return null
    }
    const sideOneExpected = calculateExpectedScore(sideOneTeamRating, sideTwoTeamRating)
    return {
        sideOneTeamRating,
        sideTwoTeamRating,
        sideOneExpected,
        sideTwoExpected: 1 - sideOneExpected,
    }
}

export {
    calculateDoublesDelta,
    calculateDoublesPlayerExpectedScore,
    calculateDoublesSideExpectedScores,
    calculateExpectedScore,
    calculateRatingDelta,
    calculateSinglesDelta,
    selectPlayerK,
    DOUBLES_SOLO_STRENGTH_MULTIPLIER,
}
