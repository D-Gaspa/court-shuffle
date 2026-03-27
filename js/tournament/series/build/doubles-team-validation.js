import { normalizeTeamKey } from "./shared.js"

function toUniquePlayers(a, b) {
    return [...new Set([a, b].filter(Boolean))]
}

function getTeamRowError({ a, b, uniquePlayers, allowNotStrictDoubles, label }) {
    if (uniquePlayers.length === 0) {
        return `Every ${label} doubles team row must include at least one player.`
    }
    if (a && b && a === b) {
        return label === "restricted"
            ? "Restricted doubles pairs must use two different players."
            : "Locked doubles pairs must use two different players."
    }
    if (!allowNotStrictDoubles && uniquePlayers.length !== 2) {
        return `Strict doubles ${label} teams must include exactly two players.`
    }
    return null
}

function hasInactivePlayers(uniquePlayers, entrantsSet) {
    return !uniquePlayers.every((player) => entrantsSet.has(player))
}

function hasDuplicateLockedPlayers(uniquePlayers, lockedPlayers) {
    return uniquePlayers.some((player) => lockedPlayers.has(player))
}

function registerLockedPlayers(uniquePlayers, lockedPlayers) {
    for (const player of uniquePlayers) {
        lockedPlayers.add(player)
    }
}

function validateLockedPairs({ entrants, normalizedAdvanced, allowNotStrictDoubles, errors }) {
    const entrantsSet = new Set(entrants)
    const lockedPairs = normalizedAdvanced.doublesLockedPairs.filter(([a, b]) => a || b)
    const lockedPlayers = new Set()
    const validLockedTeams = []
    const lockedTeamKeys = new Set()
    let soloLockedTeamCount = 0
    const availableSoloTeamSlots = allowNotStrictDoubles ? entrants.length % 2 : 0

    for (const [a, b] of lockedPairs) {
        const uniquePlayers = toUniquePlayers(a, b)
        const rowError = getTeamRowError({ a, b, uniquePlayers, allowNotStrictDoubles, label: "locked" })
        if (rowError) {
            errors.push(rowError)
            continue
        }
        if (allowNotStrictDoubles && uniquePlayers.length === 1) {
            soloLockedTeamCount += 1
        }
        if (hasInactivePlayers(uniquePlayers, entrantsSet)) {
            errors.push("Locked doubles teams must use currently active players.")
            continue
        }
        if (hasDuplicateLockedPlayers(uniquePlayers, lockedPlayers)) {
            errors.push("A player cannot be assigned to multiple locked doubles teams.")
            continue
        }
        registerLockedPlayers(uniquePlayers, lockedPlayers)
        validLockedTeams.push(uniquePlayers)
        lockedTeamKeys.add(normalizeTeamKey(uniquePlayers))
    }

    if (soloLockedTeamCount > availableSoloTeamSlots) {
        errors.push(
            `Solo locked doubles teams exceed available 2v1 team slots (${availableSoloTeamSlots}) for this roster.`,
        )
    }

    return {
        entrantsSet,
        lockedTeamKeys,
        validLockedPairs: validLockedTeams,
    }
}

function collectRestrictedTeamKeys({ entrantsSet, restrictedRows, allowNotStrictDoubles, lockedTeamKeys, errors }) {
    const restrictedTeamKeys = new Set()

    for (const [a, b] of restrictedRows) {
        const uniquePlayers = toUniquePlayers(a, b)
        const rowError = getTeamRowError({
            a,
            b,
            uniquePlayers,
            allowNotStrictDoubles,
            label: "restricted",
        })
        if (rowError) {
            errors.push(rowError)
            continue
        }
        if (hasInactivePlayers(uniquePlayers, entrantsSet)) {
            errors.push("Restricted doubles teams must use currently active players.")
            continue
        }

        const teamKey = normalizeTeamKey(uniquePlayers)
        if (restrictedTeamKeys.has(teamKey)) {
            errors.push("Restricted doubles teams cannot contain duplicates.")
            continue
        }
        if (lockedTeamKeys.has(teamKey)) {
            errors.push("A doubles team cannot be both locked and restricted.")
            continue
        }
        restrictedTeamKeys.add(teamKey)
    }

    return restrictedTeamKeys
}

function buildRestrictedTeamKeySet({ entrants, advanced, allowNotStrictDoubles }) {
    const entrantsSet = new Set(entrants)
    const restrictedTeamKeys = new Set()
    const restrictedRows = advanced?.doublesRestrictedTeams || []

    for (const [a, b] of restrictedRows) {
        const uniquePlayers = toUniquePlayers(a, b)
        const rowError = getTeamRowError({
            a,
            b,
            uniquePlayers,
            allowNotStrictDoubles,
            label: "restricted",
        })
        if (rowError || hasInactivePlayers(uniquePlayers, entrantsSet)) {
            continue
        }
        restrictedTeamKeys.add(normalizeTeamKey(uniquePlayers))
    }

    return restrictedTeamKeys
}

function teamsContainRestrictedTeam(teams, restrictedTeamKeys) {
    if (!(Array.isArray(teams) && restrictedTeamKeys.size > 0)) {
        return false
    }
    return teams.some((team) => restrictedTeamKeys.has(normalizeTeamKey(team.players)))
}

function getDoublesPartitionError(validLockedPairs, restrictedTeamKeys) {
    if (validLockedPairs.length > 0 && restrictedTeamKeys.size > 0) {
        return "Unable to build doubles teams with the selected locked and restricted teams."
    }
    if (restrictedTeamKeys.size > 0) {
        return "Unable to build doubles teams while avoiding the selected restricted teams."
    }
    return "Unable to build doubles teams from the selected locked pairs."
}

export {
    buildRestrictedTeamKeySet,
    collectRestrictedTeamKeys,
    getDoublesPartitionError,
    teamsContainRestrictedTeam,
    validateLockedPairs,
}
