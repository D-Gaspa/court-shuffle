import { collectLockedPairKeySet, normalizeTeamKey, toLockedTeamPlayers } from "../model/helpers.js"

function getRestrictedRowMissingError(allowNotStrictDoubles) {
    return allowNotStrictDoubles
        ? "Every restricted doubles team row must include at least one player."
        : "Every restricted doubles pair row must select two players."
}

function getRestrictedTeamPlayers(row, allowNotStrictDoubles) {
    const teamPlayers = toLockedTeamPlayers(row, allowNotStrictDoubles)
    if (!teamPlayers) {
        return { error: getRestrictedRowMissingError(allowNotStrictDoubles), teamPlayers: null }
    }
    if (!allowNotStrictDoubles && teamPlayers.length !== 2) {
        return { error: "Strict doubles restricted teams must include exactly two players.", teamPlayers: null }
    }
    return { error: null, teamPlayers }
}

function validateRestrictedRow(row, allowNotStrictDoubles, activePlayers, restrictedTeamKeys) {
    if (!(row?.[0] || row?.[1])) {
        return null
    }

    const { error, teamPlayers } = getRestrictedTeamPlayers(row, allowNotStrictDoubles)
    if (error) {
        return error
    }
    if (!teamPlayers.every((player) => activePlayers.has(player))) {
        return "Restricted doubles teams must use active entrants."
    }

    const key = normalizeTeamKey(teamPlayers)
    if (restrictedTeamKeys.has(key)) {
        return "Restricted doubles teams cannot contain duplicates."
    }
    restrictedTeamKeys.add(key)
    return null
}

function validateDoublesRestrictedRows(rows, allowNotStrictDoubles, activePlayers) {
    const restrictedTeamKeys = new Set()
    for (const row of rows || []) {
        const error = validateRestrictedRow(row, allowNotStrictDoubles, activePlayers, restrictedTeamKeys)
        if (error) {
            return error
        }
    }
    return null
}

function validateLockedRestrictedOverlap(lockedRows, restrictedRows, allowNotStrictDoubles) {
    const lockedKeys = collectLockedPairKeySet(lockedRows, allowNotStrictDoubles)
    const restrictedKeys = collectLockedPairKeySet(restrictedRows, allowNotStrictDoubles)
    for (const key of restrictedKeys) {
        if (lockedKeys.has(key)) {
            return "A doubles team cannot be both locked and restricted."
        }
    }
    return null
}

export { validateDoublesRestrictedRows, validateLockedRestrictedOverlap }
