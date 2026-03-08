import {
    collectLockedPairKeySet,
    normalizeTeamKey,
    normalizeTeamPlayers,
    toLockedTeamPlayers,
    validateDoublesByeTeams,
    validateSinglesRows,
} from "./advanced-model-helpers.js"
import { requiresForcedSitOut } from "./advanced-rules.js"

function getLockedRowMissingError(allowNotStrictDoubles) {
    return allowNotStrictDoubles
        ? "Every locked doubles team row must include at least one player."
        : "Every locked doubles pair row must select two players."
}

function getLockedTeamSizeError(teamPlayers, allowNotStrictDoubles) {
    if (!teamPlayers) {
        return getLockedRowMissingError(allowNotStrictDoubles)
    }
    if (!allowNotStrictDoubles && teamPlayers.length !== 2) {
        return "Strict doubles locked teams must include exactly two players."
    }
    return null
}

function collectLockedPlayers(usedPlayers, teamPlayers) {
    for (const player of teamPlayers) {
        if (usedPlayers.has(player)) {
            return false
        }
        usedPlayers.add(player)
    }
    return true
}

function getLockedRowValues(row) {
    return [typeof row?.[0] === "string" ? row[0] : "", typeof row?.[1] === "string" ? row[1] : ""]
}

function isBlankLockedRow(row) {
    const [left, right] = getLockedRowValues(row)
    return !(left || right)
}

function validateLockedTeamPlayers(row, allowNotStrictDoubles) {
    const teamPlayers = toLockedTeamPlayers(row, allowNotStrictDoubles)
    const rowError = getLockedTeamSizeError(teamPlayers, allowNotStrictDoubles)
    if (rowError) {
        return { error: rowError, teamPlayers: null }
    }
    return { error: null, teamPlayers }
}

function updateLockedRowStats({ row, allowNotStrictDoubles, usedPlayers, soloLocks }) {
    if (isBlankLockedRow(row)) {
        return { error: null, soloLocks }
    }

    const { error, teamPlayers } = validateLockedTeamPlayers(row, allowNotStrictDoubles)
    if (error) {
        return { error, soloLocks }
    }
    if (teamPlayers.length === 1) {
        soloLocks += 1
    }
    if (!collectLockedPlayers(usedPlayers, teamPlayers)) {
        return { error: "A player cannot be assigned to multiple locked doubles teams.", soloLocks }
    }
    return { error: null, soloLocks }
}

function validateDoublesLockedRows(rows, allowNotStrictDoubles) {
    const usedPlayers = new Set()
    let soloLocks = 0

    for (const row of rows || []) {
        const { error, soloLocks: nextSoloLocks } = updateLockedRowStats({
            row,
            allowNotStrictDoubles,
            usedPlayers,
            soloLocks,
        })
        if (error) {
            return error
        }
        soloLocks = nextSoloLocks
    }

    if (allowNotStrictDoubles && soloLocks > 1) {
        return "Only one solo locked doubles team is allowed when 2v1 is enabled."
    }
    return null
}

function countSoloLockedTeams(rows) {
    let count = 0
    for (const row of rows || []) {
        const teamPlayers = toLockedTeamPlayers(row, true)
        if (teamPlayers?.length === 1) {
            count += 1
        }
    }
    return count
}

function validateSinglesOpeningConstraint(advancedDraft, tournamentFormat, tournamentTeamSize) {
    if (!(tournamentFormat === "round-robin" && tournamentTeamSize === 1)) {
        return null
    }
    const hasMatchups = advancedDraft.singlesOpeningMatchups.some(([a, b]) => Boolean(a || b))
    return hasMatchups ? "Singles opening matchups are not supported for round-robin." : null
}

function validateSoloLockCapacity(advancedDraft, allowNotStrictDoubles, selectedPlayers) {
    if (!allowNotStrictDoubles) {
        return null
    }
    const soloLocks = countSoloLockedTeams(advancedDraft.doublesLockedPairs)
    const availableSoloSlots = selectedPlayers.length % 2
    if (soloLocks <= availableSoloSlots) {
        return null
    }
    return `Solo locked doubles teams exceed available 2v1 team slots (${availableSoloSlots}) for this roster.`
}

function validateByeTeamMembership(advancedDraft, allowNotStrictDoubles) {
    const lockedPairKeySet = collectLockedPairKeySet(advancedDraft.doublesLockedPairs, allowNotStrictDoubles)
    for (const team of advancedDraft.doublesByeTeams) {
        const normalized = normalizeTeamPlayers(team)
        const validTeamSize = normalized.length === 2 || (allowNotStrictDoubles && normalized.length === 1)
        if (!validTeamSize) {
            continue
        }
        if (!lockedPairKeySet.has(normalizeTeamKey(normalized))) {
            return "Doubles bye teams must be selected from locked doubles teams."
        }
    }
    return null
}

function validateForcedSitOutConstraint({
    advancedDraft,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    const forcedSitOutRequired = requiresForcedSitOut({
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
    })
    if (!forcedSitOutRequired && advancedDraft.forcedSitOutPlayer) {
        return "Required sit-out can only be set when strict doubles has an odd player count."
    }
    return null
}

function validateAdvancedDraft({
    advancedDraft,
    tournamentFormat,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    const roundRobinError = validateSinglesOpeningConstraint(advancedDraft, tournamentFormat, tournamentTeamSize)
    if (roundRobinError) {
        return roundRobinError
    }

    const singlesError = validateSinglesRows(advancedDraft.singlesOpeningMatchups, "singles opening matchup")
    if (singlesError) {
        return singlesError
    }

    const doublesError = validateDoublesLockedRows(advancedDraft.doublesLockedPairs, allowNotStrictDoubles)
    if (doublesError) {
        return doublesError
    }

    const soloCapacityError = validateSoloLockCapacity(advancedDraft, allowNotStrictDoubles, selectedPlayers)
    if (soloCapacityError) {
        return soloCapacityError
    }

    const byeError = validateDoublesByeTeams(advancedDraft.doublesByeTeams, allowNotStrictDoubles)
    if (byeError) {
        return byeError
    }

    const byeMembershipError = validateByeTeamMembership(advancedDraft, allowNotStrictDoubles)
    if (byeMembershipError) {
        return byeMembershipError
    }

    return validateForcedSitOutConstraint({
        advancedDraft,
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
    })
}

export { validateAdvancedDraft }
