import { enumeratePartitions } from "./doubles-series-partitions.js"
import { buildRestrictedTeamKeySet, collectRestrictedTeamKeys, validateLockedPairs } from "./doubles-team-validation.js"
import { normalizeAdvancedSettings, normalizeTeamKey } from "./shared.js"

function buildEntrants(players, sitOutPlayer) {
    if (!sitOutPlayer) {
        return [...players]
    }
    return players.filter((player) => player !== sitOutPlayer)
}

function buildSitOutOptions(players, allowNotStrictDoubles, forcedSitOutPlayer = null) {
    if (allowNotStrictDoubles || players.length % 2 === 0) {
        return [null]
    }
    if (forcedSitOutPlayer) {
        return [forcedSitOutPlayer]
    }
    return [...players]
}

function createCandidate(partition, entrants, sitOutPlayer) {
    return {
        entrants: [...entrants],
        partition,
        sitOutPlayer,
        teamKeys: partition.map((team) => normalizeTeamKey(team)),
        tournamentLevelSitOuts: sitOutPlayer ? [sitOutPlayer] : [],
    }
}

function buildAllCandidates({ players, allowNotStrictDoubles, restrictedTeamKeys }) {
    const candidates = []
    const sitOutOptions = buildSitOutOptions(players, allowNotStrictDoubles)

    for (const sitOutPlayer of sitOutOptions) {
        const entrants = buildEntrants(players, sitOutPlayer)
        if (entrants.length < 2) {
            continue
        }
        const partitions = enumeratePartitions({
            entrants,
            restrictedTeamKeys,
        })
        for (const partition of partitions) {
            candidates.push(createCandidate(partition, entrants, sitOutPlayer))
        }
    }

    return candidates
}

function buildFirstRunState({ candidate, normalizedAdvanced, allowNotStrictDoubles }) {
    const errors = []
    const { entrantsSet, lockedTeamKeys, validLockedPairs } = validateLockedPairs({
        entrants: candidate.entrants,
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
    if (candidate.entrants.length < 2) {
        errors.push("Not enough active entrants to build a doubles tournament.")
    }
    return {
        errors,
        lockedTeamKeys,
        restrictedTeamKeys,
        validLockedPairs,
    }
}

function shouldConsiderCandidate(candidate, normalizedAdvanced, allowNotStrictDoubles) {
    if (allowNotStrictDoubles || !normalizedAdvanced.forcedSitOutPlayer) {
        return true
    }
    return candidate.sitOutPlayer === normalizedAdvanced.forcedSitOutPlayer
}

function includesLockedTeams(candidate, lockedTeamKeys) {
    if (lockedTeamKeys.size === 0) {
        return true
    }
    const teamKeys = new Set(candidate.teamKeys)
    for (const teamKey of lockedTeamKeys) {
        if (!teamKeys.has(teamKey)) {
            return false
        }
    }
    return true
}

function buildValidationErrors(players, normalizedAdvanced, allowNotStrictDoubles) {
    const errors = []
    if (
        !allowNotStrictDoubles &&
        normalizedAdvanced.forcedSitOutPlayer &&
        !players.includes(normalizedAdvanced.forcedSitOutPlayer)
    ) {
        errors.push("Required sit-out player must be part of the selected roster.")
    }
    if (players.length < 2) {
        errors.push("Not enough active entrants to build a doubles tournament.")
    }
    return errors
}

function filterFirstRunCandidates({ candidates, normalizedAdvanced, allowNotStrictDoubles }) {
    const firstCandidates = []
    const validationErrors = new Set()
    let partitionErrorState = null

    for (const candidate of candidates) {
        if (!shouldConsiderCandidate(candidate, normalizedAdvanced, allowNotStrictDoubles)) {
            continue
        }

        const state = buildFirstRunState({
            candidate,
            normalizedAdvanced,
            allowNotStrictDoubles,
        })
        if (state.errors.length > 0) {
            for (const error of state.errors) {
                validationErrors.add(error)
            }
            continue
        }
        if (!includesLockedTeams(candidate, state.lockedTeamKeys)) {
            partitionErrorState = partitionErrorState || state
            continue
        }

        partitionErrorState = partitionErrorState || state
        firstCandidates.push(candidate)
    }

    return {
        firstCandidates,
        errors: [...validationErrors],
        partitionErrorState,
    }
}

function buildDoublesSeriesCandidates({ players, allowNotStrictDoubles, advanced }) {
    const normalizedAdvanced = normalizeAdvancedSettings(advanced)
    const validationErrors = buildValidationErrors(players, normalizedAdvanced, allowNotStrictDoubles)
    if (validationErrors.length > 0) {
        return {
            normalizedAdvanced,
            allCandidates: [],
            firstCandidates: [],
            errors: validationErrors,
            partitionErrorState: null,
        }
    }

    const restrictedTeamKeys = buildRestrictedTeamKeySet({
        entrants: players,
        advanced: normalizedAdvanced,
        allowNotStrictDoubles,
    })
    const allCandidates = buildAllCandidates({
        players,
        allowNotStrictDoubles,
        restrictedTeamKeys,
    })
    const firstRunState = filterFirstRunCandidates({
        candidates: allCandidates,
        normalizedAdvanced,
        allowNotStrictDoubles,
    })

    return {
        normalizedAdvanced,
        allCandidates,
        firstCandidates: firstRunState.firstCandidates,
        errors: firstRunState.errors,
        partitionErrorState: firstRunState.partitionErrorState,
    }
}

export { buildDoublesSeriesCandidates }
