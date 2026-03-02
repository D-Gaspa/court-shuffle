import { shuffleWithRng } from "../../../core/random.js"
import { buildBracketDoublesRun, buildRoundRobinDoublesRun, validateRoundRobinByeOverrides } from "./doubles-byes.js"
import {
    buildDoublesTeamPartition,
    buildTournamentRunFromTeams,
    chooseTournamentSitOut,
    makeTeamObject,
    markPartnerPairsFromTeams,
    normalizeAdvancedSettings,
} from "./shared.js"

function toShuffledTeams(partition, rng) {
    let teams = partition.map((teamPlayers, i) => makeTeamObject(teamPlayers, i))
    teams = shuffleWithRng(teams, rng).map((team, i) => ({ ...team, id: i }))
    return teams
}

function resolveDoublesEntrants({ players, allowNotStrictDoubles, normalizedAdvanced, sitOutCounts, rng, errors }) {
    const entrants = [...players]
    const tournamentLevelSitOuts = []
    const requiredSitOut = !allowNotStrictDoubles && entrants.length % 2 !== 0
    const { forcedSitOutPlayer } = normalizedAdvanced

    if (requiredSitOut) {
        if (forcedSitOutPlayer && !entrants.includes(forcedSitOutPlayer)) {
            errors.push("Required sit-out player must be part of the selected roster.")
            return { entrants, tournamentLevelSitOuts }
        }
        const sitOut = forcedSitOutPlayer || chooseTournamentSitOut(entrants, sitOutCounts, rng)
        if (!sitOut) {
            errors.push("Unable to resolve required doubles sit-out player.")
            return { entrants, tournamentLevelSitOuts }
        }
        tournamentLevelSitOuts.push(sitOut)
        sitOutCounts[sitOut] = (sitOutCounts[sitOut] || 0) + 1
        const idx = entrants.indexOf(sitOut)
        if (idx !== -1) {
            entrants.splice(idx, 1)
        }
        return { entrants, tournamentLevelSitOuts }
    }

    if (forcedSitOutPlayer) {
        errors.push("Manual sit-out is only available when strict doubles requires one sit-out.")
    }
    return { entrants, tournamentLevelSitOuts }
}

function toUniqueLockedPlayers(a, b) {
    return [...new Set([a, b].filter(Boolean))]
}

function getLockedTeamRowError({ a, b, uniquePlayers, allowNotStrictDoubles }) {
    if (uniquePlayers.length === 0) {
        return "Every locked doubles team row must include at least one player."
    }
    if (a && b && a === b) {
        return "Locked doubles pairs must use two different players."
    }
    if (!allowNotStrictDoubles && uniquePlayers.length !== 2) {
        return "Strict doubles locked teams must include exactly two players."
    }
    return null
}

function hasInactiveLockedPlayers(uniquePlayers, entrantsSet) {
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

function validateLockedPairs(entrants, normalizedAdvanced, allowNotStrictDoubles, errors) {
    const entrantsSet = new Set(entrants)
    const lockedPairs = normalizedAdvanced.doublesLockedPairs.filter(([a, b]) => a || b)
    const lockedPlayers = new Set()
    const validLockedTeams = []
    let soloLockedTeamCount = 0
    const availableSoloTeamSlots = allowNotStrictDoubles ? entrants.length % 2 : 0

    for (const [a, b] of lockedPairs) {
        const uniquePlayers = toUniqueLockedPlayers(a, b)
        const rowError = getLockedTeamRowError({ a, b, uniquePlayers, allowNotStrictDoubles })
        if (rowError) {
            errors.push(rowError)
            continue
        }
        if (allowNotStrictDoubles && uniquePlayers.length === 1) {
            soloLockedTeamCount += 1
        }
        if (hasInactiveLockedPlayers(uniquePlayers, entrantsSet)) {
            errors.push("Locked doubles teams must use currently active players.")
            continue
        }
        if (hasDuplicateLockedPlayers(uniquePlayers, lockedPlayers)) {
            errors.push("A player cannot be assigned to multiple locked doubles teams.")
            continue
        }
        registerLockedPlayers(uniquePlayers, lockedPlayers)
        validLockedTeams.push(uniquePlayers)
    }

    if (soloLockedTeamCount > availableSoloTeamSlots) {
        errors.push(
            `Solo locked doubles teams exceed available 2v1 team slots (${availableSoloTeamSlots}) for this roster.`,
        )
    }

    return {
        entrantsSet,
        validLockedPairs: validLockedTeams,
    }
}

function buildTeamsFromLockedPairs({ entrants, validLockedPairs, usedDoublesPartnerPairs, rng }) {
    const partition = buildDoublesTeamPartition(entrants, usedDoublesPartnerPairs, rng, validLockedPairs)
    if (!partition) {
        return null
    }
    return toShuffledTeams(partition, rng)
}

function buildDoublesFirstRun({
    players,
    format,
    allowNotStrictDoubles,
    advanced,
    usedDoublesPartnerPairs,
    sitOutCounts,
    courtCount,
    courtHandling,
    rng,
}) {
    const errors = []
    const normalizedAdvanced = normalizeAdvancedSettings(advanced)
    const { entrants, tournamentLevelSitOuts } = resolveDoublesEntrants({
        players,
        allowNotStrictDoubles,
        normalizedAdvanced,
        sitOutCounts,
        rng,
        errors,
    })
    const { entrantsSet, validLockedPairs } = validateLockedPairs(
        entrants,
        normalizedAdvanced,
        allowNotStrictDoubles,
        errors,
    )

    if (entrants.length < 2) {
        errors.push("Not enough active entrants to build a doubles tournament.")
    }
    if (errors.length > 0) {
        return { run: null, errors }
    }

    const teams = buildTeamsFromLockedPairs({ entrants, validLockedPairs, usedDoublesPartnerPairs, rng })
    if (!teams) {
        return { run: null, errors: ["Unable to build doubles teams from the selected locked pairs."] }
    }

    const roundRobinError = validateRoundRobinByeOverrides(format, normalizedAdvanced)
    if (roundRobinError) {
        return { run: null, errors: [roundRobinError] }
    }
    if (format === "round-robin") {
        return buildRoundRobinDoublesRun({
            format,
            teams,
            entrants,
            tournamentLevelSitOuts,
            courtCount,
            courtHandling,
            usedDoublesPartnerPairs,
        })
    }
    return buildBracketDoublesRun({
        teams,
        normalizedAdvanced,
        allowNotStrictDoubles,
        entrantsSet,
        errors,
        rng,
        format,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
        courtHandling,
        usedDoublesPartnerPairs,
    })
}

function buildDoublesTournament({
    players,
    format,
    allowNotStrictDoubles,
    usedDoublesPartnerPairs,
    sitOutCounts,
    courtCount,
    courtHandling,
    rng,
}) {
    const entrants = [...players]
    const tournamentLevelSitOuts = []
    if (!allowNotStrictDoubles && entrants.length % 2 !== 0) {
        const sitOut = chooseTournamentSitOut(entrants, sitOutCounts, rng)
        tournamentLevelSitOuts.push(sitOut)
        const idx = entrants.indexOf(sitOut)
        if (idx !== -1) {
            entrants.splice(idx, 1)
        }
    }
    if (entrants.length < 2) {
        return null
    }

    const partition = buildDoublesTeamPartition(entrants, usedDoublesPartnerPairs, rng)
    if (!partition) {
        return null
    }
    const teams = toShuffledTeams(partition, rng)
    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
        courtHandling,
    })
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return run
}

export { buildDoublesFirstRun, buildDoublesTournament }
