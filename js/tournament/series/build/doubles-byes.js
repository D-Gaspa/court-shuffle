import { shuffleWithRng } from "../../../core/random.js"
import { nextPowerOf2 } from "../../engine.js"
import {
    buildTournamentRunFromTeams,
    createBracketFirstRoundWithOverrides,
    markPartnerPairsFromTeams,
    normalizeTeamKey,
} from "./shared.js"

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

function resolveRequestedByeTeamId({ uniquePlayers, teamsByKey, requestedByeIdSet, errors }) {
    const teamId = teamsByKey.get(normalizeTeamKey(uniquePlayers))
    if (!Number.isInteger(teamId)) {
        errors.push(`Doubles bye team "${uniquePlayers.join(" & ")}" does not match a generated team.`)
        return null
    }
    if (requestedByeIdSet.has(teamId)) {
        errors.push("Doubles bye teams cannot contain duplicates.")
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
        const teamId = resolveRequestedByeTeamId({ uniquePlayers, teamsByKey, requestedByeIdSet, errors })
        if (!Number.isInteger(teamId)) {
            continue
        }
        requestedByeIdSet.add(teamId)
        requestedByeTeamIds.push(teamId)
    }
    return { requestedByeTeamIds, requestedByeIdSet }
}

function buildRoundRobinDoublesRun({
    format,
    teams,
    entrants,
    tournamentLevelSitOuts,
    courtCount,
    courtHandling,
    usedDoublesPartnerPairs,
}) {
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
    courtHandling,
    usedDoublesPartnerPairs,
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
        rng,
    })
    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
        courtHandling,
        firstRoundOverride: firstRound,
    })
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return { run, errors: [] }
}

export { buildBracketDoublesRun, buildRoundRobinDoublesRun, validateRoundRobinByeOverrides }
