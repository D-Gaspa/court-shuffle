function normalizeSets(entry) {
    if (!entry) {
        return null
    }
    if (entry.sets && Array.isArray(entry.sets)) {
        return entry.sets
    }
    if (entry.score && Array.isArray(entry.score)) {
        return [entry.score]
    }
    return null
}

function isWholeNumber(value) {
    return Number.isInteger(value) && value >= 0
}

const TIEBREAK_SET_WINNER_GAMES = 7
const TIEBREAK_SET_LOSER_GAMES = 6
const STANDARD_SET_WINNER_GAMES = 6
const STANDARD_SET_MAX_LOSER_GAMES = 4
const EXTENDED_SET_LOSER_GAMES = 5

function isCompleteSetScore(setScore) {
    return Array.isArray(setScore) && setScore[0] !== null && setScore[1] !== null
}

function getCompleteTiebreak(setScore) {
    const tb = setScore?.[2]?.tb
    if (!(Array.isArray(tb) && tb.length === 2 && tb[0] !== null && tb[1] !== null)) {
        return null
    }
    return tb
}

function validateTiebreakScore(tiebreak, winnerIndex) {
    if (!tiebreak) {
        return "A 7-6 set requires a tiebreak score."
    }

    const [tbA, tbB] = tiebreak
    if (!(isWholeNumber(tbA) && isWholeNumber(tbB))) {
        return "Tiebreak scores must be whole numbers."
    }
    if (tbA === tbB) {
        return "Tiebreak cannot be tied."
    }
    if ((winnerIndex === 0 && tbA <= tbB) || (winnerIndex === 1 && tbB <= tbA)) {
        return "Winning side tiebreak must be higher."
    }
    return ""
}

function isValidStraightSet(winnerGames, loserGames) {
    return winnerGames === STANDARD_SET_WINNER_GAMES && loserGames <= STANDARD_SET_MAX_LOSER_GAMES
}

function isValidExtendedSet(winnerGames, loserGames) {
    return winnerGames === TIEBREAK_SET_WINNER_GAMES && loserGames === EXTENDED_SET_LOSER_GAMES
}

function getSetValidationMessage(setScore) {
    if (!isCompleteSetScore(setScore)) {
        return ""
    }

    const [gamesA, gamesB] = setScore
    if (!(isWholeNumber(gamesA) && isWholeNumber(gamesB))) {
        return "Set scores must be whole numbers."
    }
    if (gamesA === gamesB) {
        return "Set score cannot be tied."
    }

    const winnerGames = Math.max(gamesA, gamesB)
    const loserGames = Math.min(gamesA, gamesB)
    const tiebreak = getCompleteTiebreak(setScore)
    const winnerIndex = gamesA > gamesB ? 0 : 1

    if (winnerGames === TIEBREAK_SET_WINNER_GAMES && loserGames === TIEBREAK_SET_LOSER_GAMES) {
        return validateTiebreakScore(tiebreak, winnerIndex)
    }

    if (tiebreak) {
        return "Only 7-6 sets can include a tiebreak score."
    }

    if (isValidStraightSet(winnerGames, loserGames)) {
        return ""
    }
    if (isValidExtendedSet(winnerGames, loserGames)) {
        return ""
    }

    return "Set scores must be 6-0 to 6-4, 7-5, or 7-6 with a tiebreak."
}

function getScoreValidation(sets) {
    const normalizedSets = Array.isArray(sets) ? sets : []
    const completeSets = []
    const validSets = []
    const invalidSets = []

    for (const setScore of normalizedSets) {
        if (!isCompleteSetScore(setScore)) {
            continue
        }
        completeSets.push(setScore)
        const message = getSetValidationMessage(setScore)
        if (message) {
            invalidSets.push({ setScore, message })
            continue
        }
        validSets.push(setScore)
    }

    return {
        completeSets,
        validSets,
        invalidSets,
        hasInvalidCompletedSet: invalidSets.length > 0,
        firstInvalidMessage: invalidSets[0]?.message || "",
    }
}

function isValidScoreEntry(entry) {
    const validation = getScoreValidation(normalizeSets(entry))
    return validation.validSets.length > 0 && validation.hasInvalidCompletedSet === false
}

function hasSavedScoreEntry(entry) {
    return isValidScoreEntry(entry)
}

function formatSets(sets) {
    return sets
        .filter(([a, b]) => a !== null && b !== null)
        .map((s) => {
            const base = `${s[0]}–${s[1]}`
            if (s[2]?.tb) {
                const [tbA, tbB] = s[2].tb
                if (tbA !== null && tbB !== null) {
                    return `${base} (${tbA}–${tbB})`
                }
            }
            return base
        })
        .join(", ")
}

/**
 * Count set wins from a list of sets.
 * Returns { winsA, winsB } considering only complete sets.
 */
function countSetWins(sets) {
    let winsA = 0
    let winsB = 0
    for (const s of getScoreValidation(sets).validSets) {
        if (s[0] > s[1]) {
            winsA += 1
        } else if (s[1] > s[0]) {
            winsB += 1
        } else {
            winsA += 1
            winsB += 1
        }
    }
    return { winsA, winsB }
}

/**
 * Format a match summary showing set wins per side.
 * Returns e.g. "Team 1 (2) – Team 2 (1)" or null if no complete sets.
 */
function formatMatchSummary(sets, teamLabels) {
    if (!teamLabels) {
        return null
    }
    const [labelA, labelB] = teamLabels
    const { winsA, winsB } = countSetWins(sets)
    if (winsA === 0 && winsB === 0) {
        return null
    }
    return `${labelA} (${winsA}) – ${labelB} (${winsB})`
}

function cloneSets(sets) {
    return sets.map((s) => {
        const clone = [s[0], s[1]]
        if (s[2]?.tb) {
            clone.push({ tb: [...s[2].tb] })
        }
        return clone
    })
}

function parseScoreValue(value) {
    if (value === "" || value === null || value === undefined) {
        return null
    }
    const n = Number(value)
    if (!Number.isFinite(n)) {
        return null
    }
    if (n < 0) {
        return 0
    }
    return Math.floor(n)
}

function isComplete(sets) {
    const validation = getScoreValidation(sets)
    if (validation.validSets.length === 0 || validation.hasInvalidCompletedSet) {
        return false
    }
    for (const s of sets) {
        if (s[0] === null || s[1] === null) {
            return false
        }
    }
    return true
}

export {
    cloneSets,
    countSetWins,
    formatMatchSummary,
    formatSets,
    getScoreValidation,
    getSetValidationMessage,
    hasSavedScoreEntry,
    isComplete,
    isValidScoreEntry,
    normalizeSets,
    parseScoreValue,
}
