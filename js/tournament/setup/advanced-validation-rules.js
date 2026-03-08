import { getRoundOneQueueTeamSlotCount } from "./advanced-context.js"
import {
    collectLockedPairKeySet,
    getBracketByeSlotCount,
    normalizeTeamKey,
    normalizeTeamPlayers,
    toLockedTeamPlayers,
    validateDoublesByeTeams,
    validateSinglesRows,
} from "./advanced-model-helpers.js"
import { requiresForcedSitOut } from "./advanced-rules.js"
import { validateSinglesOpeningSelections } from "./advanced-validation-singles.js"

function getLockedRowMissingError(allowNotStrictDoubles) {
    return allowNotStrictDoubles
        ? "Every locked doubles team row must include at least one player."
        : "Every locked doubles pair row must select two players."
}

function getLockedTeamPlayers(row, allowNotStrictDoubles) {
    const teamPlayers = toLockedTeamPlayers(row, allowNotStrictDoubles)
    if (!teamPlayers) {
        return { error: getLockedRowMissingError(allowNotStrictDoubles), teamPlayers: null }
    }
    if (!allowNotStrictDoubles && teamPlayers.length !== 2) {
        return { error: "Strict doubles locked teams must include exactly two players.", teamPlayers: null }
    }
    return { error: null, teamPlayers }
}

function validateLockedRow(row, allowNotStrictDoubles, activePlayers, usedPlayers) {
    if (!(row?.[0] || row?.[1])) {
        return { error: null, isSoloLock: false }
    }

    const { error, teamPlayers } = getLockedTeamPlayers(row, allowNotStrictDoubles)
    if (error) {
        return { error, isSoloLock: false }
    }
    if (!teamPlayers.every((player) => activePlayers.has(player))) {
        return { error: "Locked doubles teams must use active entrants.", isSoloLock: false }
    }
    for (const player of teamPlayers) {
        if (usedPlayers.has(player)) {
            return { error: "A player cannot be assigned to multiple locked doubles teams.", isSoloLock: false }
        }
        usedPlayers.add(player)
    }
    return { error: null, isSoloLock: teamPlayers.length === 1 }
}

function validateDoublesLockedRows(rows, allowNotStrictDoubles, activePlayers) {
    const usedPlayers = new Set()
    let soloLocks = 0

    for (const row of rows || []) {
        const { error, isSoloLock } = validateLockedRow(row, allowNotStrictDoubles, activePlayers, usedPlayers)
        if (error) {
            return error
        }
        if (isSoloLock) {
            soloLocks += 1
        }
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
    if (tournamentFormat === "round-robin" && tournamentTeamSize === 1) {
        const hasMatchups = advancedDraft.singlesOpeningMatchups.some(([a, b]) => Boolean(a || b))
        if (hasMatchups) {
            return "Singles opening matchups are not supported for round-robin."
        }
    }
    return null
}

function validateSoloLockCapacity(advancedDraft, allowNotStrictDoubles, selectedPlayers) {
    if (!allowNotStrictDoubles) {
        return null
    }
    const soloLocks = countSoloLockedTeams(advancedDraft.doublesLockedPairs)
    const availableSoloSlots = selectedPlayers.length % 2
    if (soloLocks > availableSoloSlots) {
        return `Solo locked doubles teams exceed available 2v1 team slots (${availableSoloSlots}) for this roster.`
    }
    return null
}

function validateLockedTeamMembership(teams, lockedPairs, allowNotStrictDoubles, label) {
    const lockedPairKeySet = collectLockedPairKeySet(lockedPairs, allowNotStrictDoubles)
    for (const team of teams) {
        const normalized = normalizeTeamPlayers(team)
        const validTeamSize = normalized.length === 2 || (allowNotStrictDoubles && normalized.length === 1)
        if (validTeamSize && !lockedPairKeySet.has(normalizeTeamKey(normalized))) {
            return `${label} must be selected from locked doubles teams.`
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

function validateByeSlotCapacity({
    advancedDraft,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    const byeSlotCount = getBracketByeSlotCount({
        selectedPlayers,
        tournamentTeamSize,
        allowNotStrictDoubles,
        minRequiredSitOutPool,
    })
    if (tournamentTeamSize === 1) {
        if (advancedDraft.singlesByePlayers.length > byeSlotCount) {
            return `Singles byes exceed available Round 1 bye slots (${byeSlotCount}).`
        }
        return null
    }
    if (advancedDraft.doublesByeTeams.length > byeSlotCount) {
        return `Doubles byes exceed available Round 1 bye slots (${byeSlotCount}).`
    }
    return null
}

function validateNextUpSelections({
    advancedDraft,
    tournamentFormat,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
    courtCount,
}) {
    const nextUpSlotCount = getRoundOneQueueTeamSlotCount({
        selectedPlayers,
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        minRequiredSitOutPool,
        courtCount,
    })
    if (tournamentTeamSize === 1) {
        if (advancedDraft.singlesNextUpPlayers.length > nextUpSlotCount) {
            return `Singles next-up locks exceed available Round 1 queue slots (${nextUpSlotCount}).`
        }
        const byePlayers = new Set(advancedDraft.singlesByePlayers)
        for (const player of advancedDraft.singlesNextUpPlayers) {
            if (byePlayers.has(player)) {
                return "Singles next-up players cannot also be assigned a Round 1 bye."
            }
        }
        return null
    }

    const nextUpError = validateDoublesByeTeams(advancedDraft.doublesNextUpTeams, allowNotStrictDoubles)
    if (nextUpError) {
        return nextUpError.replace("bye team", "next-up team").replace("bye teams", "next-up teams")
    }
    if (advancedDraft.doublesNextUpTeams.length > nextUpSlotCount) {
        return `Doubles next-up locks exceed available Round 1 queue slots (${nextUpSlotCount}).`
    }
    const byeKeys = new Set(advancedDraft.doublesByeTeams.map((team) => normalizeTeamKey(normalizeTeamPlayers(team))))
    for (const team of advancedDraft.doublesNextUpTeams) {
        if (byeKeys.has(normalizeTeamKey(normalizeTeamPlayers(team)))) {
            return "Doubles next-up teams cannot also be assigned a Round 1 bye."
        }
    }
    return null
}

function runAdvancedValidationChecks({
    advancedDraft,
    tournamentFormat,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
    courtCount,
    activePlayers,
}) {
    return (
        validateSinglesOpeningConstraint(advancedDraft, tournamentFormat, tournamentTeamSize) ||
        validateSinglesRows(advancedDraft.singlesOpeningMatchups, "singles opening matchup") ||
        validateSinglesOpeningSelections(advancedDraft, tournamentTeamSize) ||
        validateDoublesLockedRows(advancedDraft.doublesLockedPairs, allowNotStrictDoubles, activePlayers) ||
        validateSoloLockCapacity(advancedDraft, allowNotStrictDoubles, selectedPlayers) ||
        validateDoublesByeTeams(advancedDraft.doublesByeTeams, allowNotStrictDoubles) ||
        validateLockedTeamMembership(
            advancedDraft.doublesByeTeams,
            advancedDraft.doublesLockedPairs,
            allowNotStrictDoubles,
            "Doubles bye teams",
        ) ||
        validateLockedTeamMembership(
            advancedDraft.doublesNextUpTeams,
            advancedDraft.doublesLockedPairs,
            allowNotStrictDoubles,
            "Doubles next-up teams",
        ) ||
        validateByeSlotCapacity({
            advancedDraft,
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers,
            minRequiredSitOutPool,
        }) ||
        validateNextUpSelections({
            advancedDraft,
            tournamentFormat,
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers,
            minRequiredSitOutPool,
            courtCount,
        }) ||
        validateForcedSitOutConstraint({
            advancedDraft,
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers,
            minRequiredSitOutPool,
        }) ||
        null
    )
}

export { runAdvancedValidationChecks }
