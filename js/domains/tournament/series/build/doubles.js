import { shuffleWithRng } from "../../../../platform/random/index.js"
import { buildBracketDoublesRun, buildRoundRobinDoublesRun, validateRoundRobinByeOverrides } from "./doubles-byes.js"
import {
    buildRestrictedTeamKeySet,
    collectRestrictedTeamKeys,
    getDoublesPartitionError,
    teamsContainRestrictedTeam,
    validateLockedPairs,
} from "./doubles-team-validation.js"
import {
    buildDoublesTeamPartition,
    buildTournamentRunFromTeams,
    chooseTournamentSitOut,
    makeTeamObject,
    markDoublesTeamKeysFromTeams,
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

function buildTeamsFromLockedPairs({
    entrants,
    validLockedPairs,
    restrictedTeamKeys,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    rng,
}) {
    const partition = buildDoublesTeamPartition({
        players: entrants,
        usedPartnerPairs: usedDoublesPartnerPairs,
        usedTeamKeys: usedDoublesTeamKeys,
        restrictedTeamKeys,
        rng,
        seedBuckets: validLockedPairs,
    })
    if (!partition) {
        return null
    }
    return toShuffledTeams(partition, rng)
}

function prepareDoublesFirstRun({ players, allowNotStrictDoubles, advanced, sitOutCounts, rng }) {
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
    const { entrantsSet, lockedTeamKeys, validLockedPairs } = validateLockedPairs({
        entrants,
        normalizedAdvanced,
        allowNotStrictDoubles,
        errors,
    })
    const restrictedTeamKeys = collectRestrictedTeamKeys({
        entrantsSet,
        restrictedRows: normalizedAdvanced.doublesRestrictedTeams.filter(([a, b]) => a || b),
        allowNotStrictDoubles,
        lockedTeamKeys,
        errors,
    })

    if (entrants.length < 2) {
        errors.push("Not enough active entrants to build a doubles tournament.")
    }

    return {
        entrants,
        entrantsSet,
        errors,
        normalizedAdvanced,
        restrictedTeamKeys,
        tournamentLevelSitOuts,
        validLockedPairs,
    }
}

function resolveFirstRunTeams(preparedRun, usedDoublesPartnerPairs, usedDoublesTeamKeys, rng) {
    const { entrants, restrictedTeamKeys, validLockedPairs } = preparedRun
    return buildTeamsFromLockedPairs({
        entrants,
        validLockedPairs,
        restrictedTeamKeys,
        usedDoublesPartnerPairs,
        usedDoublesTeamKeys,
        rng,
    })
}

function getBuiltRestrictedTeamError(validLockedPairs, restrictedTeamKeys) {
    return getDoublesPartitionError(validLockedPairs, restrictedTeamKeys)
}

function buildFirstRunTournament({
    format,
    teams,
    normalizedAdvanced,
    allowNotStrictDoubles,
    entrantsSet,
    errors,
    rng,
    entrants,
    tournamentLevelSitOuts,
    courtCount,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
}) {
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
            usedDoublesPartnerPairs,
            usedDoublesTeamKeys,
            normalizedAdvanced,
            allowNotStrictDoubles,
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
        usedDoublesPartnerPairs,
        usedDoublesTeamKeys,
    })
}

function buildDoublesFirstRun({
    players,
    format,
    allowNotStrictDoubles,
    advanced,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    sitOutCounts,
    courtCount,
    rng,
}) {
    const preparedRun = prepareDoublesFirstRun({
        players,
        allowNotStrictDoubles,
        advanced,
        sitOutCounts,
        rng,
    })
    const {
        entrants,
        entrantsSet,
        errors,
        normalizedAdvanced,
        restrictedTeamKeys,
        tournamentLevelSitOuts,
        validLockedPairs,
    } = preparedRun

    if (errors.length > 0) {
        return { run: null, errors }
    }

    const teams = resolveFirstRunTeams(preparedRun, usedDoublesPartnerPairs, usedDoublesTeamKeys, rng)
    if (!teams) {
        return { run: null, errors: [getBuiltRestrictedTeamError(validLockedPairs, restrictedTeamKeys)] }
    }
    if (teamsContainRestrictedTeam(teams, restrictedTeamKeys)) {
        return { run: null, errors: [getBuiltRestrictedTeamError(validLockedPairs, restrictedTeamKeys)] }
    }
    return buildFirstRunTournament({
        format,
        teams,
        normalizedAdvanced,
        allowNotStrictDoubles,
        entrantsSet,
        errors,
        rng,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
        usedDoublesPartnerPairs,
        usedDoublesTeamKeys,
    })
}

function buildDoublesTournament({
    players,
    format,
    allowNotStrictDoubles,
    advanced,
    usedDoublesPartnerPairs,
    usedDoublesTeamKeys,
    sitOutCounts,
    courtCount,
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
    const restrictedTeamKeys = buildRestrictedTeamKeySet({
        entrants,
        advanced,
        allowNotStrictDoubles,
    })

    const partition = buildDoublesTeamPartition({
        players: entrants,
        usedPartnerPairs: usedDoublesPartnerPairs,
        usedTeamKeys: usedDoublesTeamKeys,
        restrictedTeamKeys,
        rng,
    })
    if (!partition) {
        return null
    }
    const teams = toShuffledTeams(partition, rng)
    if (teamsContainRestrictedTeam(teams, restrictedTeamKeys)) {
        return null
    }
    const run = buildTournamentRunFromTeams({
        format,
        teamSize: 2,
        teams,
        entrants,
        tournamentLevelSitOuts,
        courtCount,
    })
    markDoublesTeamKeysFromTeams(teams, usedDoublesTeamKeys)
    markPartnerPairsFromTeams(teams, usedDoublesPartnerPairs)
    return run
}

export { buildDoublesFirstRun, buildDoublesTournament, buildFirstRunTournament }
