import { shuffleWithRng } from "../../../../platform/random/index.js"
import { nextPowerOf2 } from "../../engine/bracket-factory.js"
import { reorderRoundMatchesForQueue } from "./queue.js"
import { buildTournamentRunFromTeams, markDoublesTeamKeysFromTeams, markPartnerPairsFromTeams } from "./shared.js"
import { createBracketFirstRoundWithOverrides } from "./shared-bracket-overrides.js"
import { normalizeTeamKey } from "./team-utils.js"

function validateRoundRobinByeOverrides(format, normalizedAdvanced) {
    if (format !== "round-robin") {
        return null
    }
    const hasByeOverrides = normalizedAdvanced.doublesByeTeams.some((team) => Array.isArray(team) && team.length > 0)
    if (hasByeOverrides) {
        return "Doubles bye-team assignment is not supported for round-robin tournaments."
    }
    return null
}

function validateByeTeamSize(uniquePlayers, allowNotStrictDoubles) {
    if (uniquePlayers.length === 0) {
        return "Every doubles bye team row must include at least one player."
    }
    if (!allowNotStrictDoubles && uniquePlayers.length !== 2) {
        return "Strict doubles bye teams must include exactly two players."
    }
    if (allowNotStrictDoubles && uniquePlayers.length > 2) {
        return "Doubles bye teams can include at most two players."
    }
    return null
}

function hasInactiveByeTeamPlayers(uniquePlayers, entrantsSet, errors) {
    let hasInactivePlayers = false
    for (const player of uniquePlayers) {
        if (entrantsSet.has(player)) {
            continue
        }
        errors.push("Doubles bye teams must use active entrants for Tournament 1.")
        hasInactivePlayers = true
    }
    return hasInactivePlayers
}

function hasInactiveNextUpTeamPlayers(uniquePlayers, entrantsSet, errors) {
    let hasInactivePlayers = false
    for (const player of uniquePlayers) {
        if (entrantsSet.has(player)) {
            continue
        }
        errors.push("Doubles next-up teams must use active entrants for Tournament 1.")
        hasInactivePlayers = true
    }
    return hasInactivePlayers
}

function resolveRequestedTeamId({ uniquePlayers, teamsByKey, selectedTeamIdSet, errors, label }) {
    const teamId = teamsByKey.get(normalizeTeamKey(uniquePlayers))
    if (!Number.isInteger(teamId)) {
        errors.push(`${label} "${uniquePlayers.join(" & ")}" does not match a generated team.`)
        return null
    }
    if (selectedTeamIdSet.has(teamId)) {
        errors.push(`${label}s cannot contain duplicates.`)
        return null
    }
    return teamId
}

function collectRequestedByeTeamIds({ normalizedAdvanced, allowNotStrictDoubles, entrantsSet, teams, errors }) {
    const teamsByKey = new Map(teams.map((team) => [normalizeTeamKey(team.players), team.id]))
    const requestedByeTeamIds = []
    const requestedByeIdSet = new Set()

    for (const rawTeam of normalizedAdvanced.doublesByeTeams) {
        const uniquePlayers = [...new Set((rawTeam || []).filter(Boolean))]
        const sizeError = validateByeTeamSize(uniquePlayers, allowNotStrictDoubles)
        if (sizeError) {
            errors.push(sizeError)
            continue
        }
        if (hasInactiveByeTeamPlayers(uniquePlayers, entrantsSet, errors)) {
            continue
        }
        const teamId = resolveRequestedTeamId({
            uniquePlayers,
            teamsByKey,
            selectedTeamIdSet: requestedByeIdSet,
            errors,
            label: "Doubles bye team",
        })
        if (!Number.isInteger(teamId)) {
            continue
        }
        requestedByeIdSet.add(teamId)
        requestedByeTeamIds.push(teamId)
    }
    return { requestedByeTeamIds, requestedByeIdSet }
}

function collectRequestedNextUpTeamIds({ normalizedAdvanced, allowNotStrictDoubles, entrantsSet, teams, errors }) {
    const teamsByKey = new Map(teams.map((team) => [normalizeTeamKey(team.players), team.id]))
    const selectedTeamIds = []
    const selectedTeamIdSet = new Set()

    for (const rawTeam of normalizedAdvanced.doublesNextUpTeams) {
        const uniquePlayers = [...new Set((rawTeam || []).filter(Boolean))]
        const sizeError = validateByeTeamSize(uniquePlayers, allowNotStrictDoubles)
        if (sizeError) {
            errors.push(sizeError.replace("bye team", "next-up team"))
            continue
        }
        if (hasInactiveNextUpTeamPlayers(uniquePlayers, entrantsSet, errors)) {
            continue
        }
        const teamId = resolveRequestedTeamId({
            uniquePlayers,
            teamsByKey,
            selectedTeamIdSet,
            errors,
            label: "Doubles next-up team",
        })
        if (!Number.isInteger(teamId)) {
            continue
        }
        selectedTeamIdSet.add(teamId)
        selectedTeamIds.push(teamId)
    }
    return selectedTeamIds
}

function buildRoundRobinDoublesRun({
    format,
    teams,
    entrants,
    tournamentLevelSitOuts,
    courtCount,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    normalizedAdvanced,
    allowNotStrictDoubles,
}) {
    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
    })
    const errors = []
    reorderRoundMatchesForQueue({
        run,
        delayedTeamIds: collectRequestedNextUpTeamIds({
            normalizedAdvanced,
            allowNotStrictDoubles,
            entrantsSet: new Set(entrants),
            teams,
            errors,
        }),
        courtCount,
        label: "Doubles next-up locks",
        errors,
    })
    if (errors.length > 0) {
        return { run: null, errors }
    }
    markDoublesTeamKeysFromTeams(teams, usedDoublesTeamKeys)
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return { run, errors: [] }
}

function buildBracketDoublesRun({
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
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
}) {
    const byeCount = nextPowerOf2(teams.length) - teams.length
    const { requestedByeTeamIds, requestedByeIdSet } = collectRequestedByeTeamIds({
        normalizedAdvanced,
        allowNotStrictDoubles,
        entrantsSet,
        teams,
        errors,
    })
    if (requestedByeTeamIds.length > byeCount) {
        errors.push(`Doubles bye teams exceed available Round 1 bye slots (${byeCount}).`)
    }
    const requestedNextUpTeamIds = collectRequestedNextUpTeamIds({
        normalizedAdvanced,
        allowNotStrictDoubles,
        entrantsSet,
        teams,
        errors,
    })
    if (errors.length > 0) {
        return { run: null, errors }
    }

    const remainingByeCandidates = teams.map((team) => team.id).filter((id) => !requestedByeIdSet.has(id))
    const autoByesNeeded = Math.max(0, byeCount - requestedByeIdSet.size)
    const autoByes = shuffleWithRng(remainingByeCandidates, rng).slice(0, autoByesNeeded)
    const firstRound = createBracketFirstRoundWithOverrides({
        teams,
        byeTeamIds: [...requestedByeTeamIds, ...autoByes],
        forcedPairTeamIds: [],
        delayedTeamIds: requestedNextUpTeamIds,
        courtCount,
        rng,
    })
    if (!firstRound) {
        errors.push("Doubles next-up locks could not be assigned to the available Round 1 queued matches.")
        return { run: null, errors }
    }
    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
        firstRoundOverride: firstRound,
    })
    reorderRoundMatchesForQueue({
        run,
        delayedTeamIds: requestedNextUpTeamIds,
        courtCount,
        label: "Doubles next-up locks",
        errors,
    })
    if (errors.length > 0) {
        return { run: null, errors }
    }
    markDoublesTeamKeysFromTeams(teams, usedDoublesTeamKeys)
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return { run, errors: [] }
}

export { buildBracketDoublesRun, buildRoundRobinDoublesRun, validateRoundRobinByeOverrides }
