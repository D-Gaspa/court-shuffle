/**
 * Shared tournament utilities — score evaluation and team lookups.
 */

import { getScoreValidation, normalizeSets } from "../score-editor/sets.js"

function getRoundScoreBlockReason(round) {
    if (!round?.scores) {
        return "Enter all scores"
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        if (!round.scores[i]) {
            return "Enter all scores"
        }
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        const validation = getScoreValidation(normalizeSets(round.scores[i]))
        if (validation.hasInvalidCompletedSet) {
            return "Fix invalid set score"
        }
        if (determineMatchWinner(round.scores[i]) === null) {
            return "Resolve drawn match"
        }
    }
    return null
}

/**
 * Determine which side (0 or 1) won a match based on score sets.
 * Returns 0, 1, or null if tied/undetermined.
 */
function determineMatchWinner(scoreEntry) {
    const validation = getScoreValidation(normalizeSets(scoreEntry))
    if (validation.validSets.length === 0 || validation.hasInvalidCompletedSet) {
        return null
    }
    let wins0 = 0
    let wins1 = 0
    for (const setScore of validation.validSets) {
        const [s0, s1] = setScore
        if (s0 > s1) {
            wins0 += 1
        } else if (s1 > s0) {
            wins1 += 1
        } else {
            wins0 += 1
            wins1 += 1
        }
    }
    if (wins0 > wins1) {
        return 0
    }
    if (wins1 > wins0) {
        return 1
    }
    return null
}

/**
 * Check if all matches in a round have non-null scores with a determinable winner.
 */
function allScoresEntered(round) {
    return getRoundScoreBlockReason(round) === null
}

function teamById(teams, id) {
    return teams.find((t) => t.id === id)
}

function teamByPlayers(teams, players) {
    const key = [...players].sort().join("||")
    return teams.find((t) => [...t.players].sort().join("||") === key)
}

export { determineMatchWinner, allScoresEntered, getRoundScoreBlockReason, teamById, teamByPlayers }
