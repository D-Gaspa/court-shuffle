/**
 * Shared tournament utilities — score evaluation and team lookups.
 */

/**
 * Determine which side (0 or 1) won a match based on score sets.
 * Returns 0, 1, or null if tied/undetermined.
 */
function determineMatchWinner(scoreEntry) {
    if (!scoreEntry?.sets || scoreEntry.sets.length === 0) {
        return null
    }
    let wins0 = 0
    let wins1 = 0
    let games0 = 0
    let games1 = 0
    for (const [s0, s1] of scoreEntry.sets) {
        games0 += s0
        games1 += s1
        if (s0 > s1) {
            wins0 += 1
        } else if (s1 > s0) {
            wins1 += 1
        }
    }
    if (wins0 > wins1) {
        return 0
    }
    if (wins1 > wins0) {
        return 1
    }
    if (games0 > games1) {
        return 0
    }
    if (games1 > games0) {
        return 1
    }
    return null
}

/**
 * Check if all matches in a round have non-null scores with a determinable winner.
 */
function allScoresEntered(round) {
    if (!round.scores) {
        return false
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        const s = round.scores[i]
        if (!s) {
            return false
        }
        if (determineMatchWinner(s) === null) {
            return false
        }
    }
    return true
}

function teamById(teams, id) {
    return teams.find((t) => t.id === id)
}

function teamByPlayers(teams, players) {
    const key = [...players].sort().join("||")
    return teams.find((t) => [...t.players].sort().join("||") === key)
}

export { determineMatchWinner, allScoresEntered, teamById, teamByPlayers }
