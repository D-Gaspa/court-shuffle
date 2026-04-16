import { clonePlayerNameArray, expectSessionDateString } from "./storage-validation-player.js"
import {
    cloneAdvancedSettings,
    cloneIntegerArray,
    cloneRounds,
    cloneTeamRecord,
    createValidationError,
    expectBoolean,
    expectInteger,
    expectNullableString,
    expectPlainObject,
    expectString,
    TOURNAMENT_FORMATS,
} from "./storage-validation-shared.js"
import { cloneBracket, cloneTournamentConfig, cloneTournamentSeries } from "./storage-validation-tournament.js"

function resolveLegacyTournamentTeamSize(source, path) {
    if (source.tournamentSeries?.matchType === "doubles") {
        return 2
    }
    if (source.tournamentSeries?.matchType === "singles") {
        return 1
    }
    return expectInteger(source.tournamentTeamSize, `${path}.tournamentTeamSize`, 1)
}

function deriveLegacyTournamentConfig(source, path) {
    const format = expectString(source.tournamentSeries?.format ?? source.tournamentFormat, `${path}.tournamentFormat`)
    if (!TOURNAMENT_FORMATS.has(format)) {
        throw createValidationError(`${path}.tournamentFormat`, "must be a supported tournament format.")
    }

    const teamSize = resolveLegacyTournamentTeamSize(source, path)
    if (teamSize !== 1 && teamSize !== 2) {
        throw createValidationError(`${path}.tournamentTeamSize`, "must be 1 or 2.")
    }

    return {
        format,
        teamSize,
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        courtHandling: expectString(source.tournamentSeries?.courtHandling ?? "queue", `${path}.courtHandling`),
        allowNotStrictDoubles: expectBoolean(
            source.tournamentSeries?.allowNotStrictDoubles ?? source.allowNotStrictDoubles ?? false,
            `${path}.allowNotStrictDoubles`,
        ),
        advanced: cloneAdvancedSettings(source.tournamentConfig?.advanced ?? {}, `${path}.advanced`),
        seed: expectNullableString(
            source.tournamentSeries?.seed ?? source.tournamentConfig?.seed ?? null,
            `${path}.seed`,
        ),
    }
}

function cloneInheritedConfigFlags(value, path) {
    const source = expectPlainObject(value, path)
    return {
        format: expectBoolean(source.format ?? false, `${path}.format`),
        teamSize: expectBoolean(source.teamSize ?? false, `${path}.teamSize`),
        courtCount: expectBoolean(source.courtCount ?? false, `${path}.courtCount`),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
    }
}

function cloneEditedConfigFlags(value, path) {
    const source = expectPlainObject(value, path)
    return {
        courtCount: expectBoolean(source.courtCount ?? false, `${path}.courtCount`),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
    }
}

function cloneContinuationMetadata(value, path) {
    const source = expectPlainObject(value, path)
    return {
        sourcePhaseIndex:
            source.sourcePhaseIndex === null || source.sourcePhaseIndex === undefined
                ? null
                : expectInteger(source.sourcePhaseIndex, `${path}.sourcePhaseIndex`),
        sourceTournamentIndex:
            source.sourceTournamentIndex === null || source.sourceTournamentIndex === undefined
                ? null
                : expectInteger(source.sourceTournamentIndex, `${path}.sourceTournamentIndex`),
        inheritedPhaseIndexes: cloneIntegerArray(source.inheritedPhaseIndexes ?? [], `${path}.inheritedPhaseIndexes`),
        addedPlayers: clonePlayerNameArray(source.addedPlayers ?? [], `${path}.addedPlayers`),
        removedPlayers: clonePlayerNameArray(source.removedPlayers ?? [], `${path}.removedPlayers`),
        abandonedFutureTournamentIndexes: cloneIntegerArray(
            source.abandonedFutureTournamentIndexes ?? [],
            `${path}.abandonedFutureTournamentIndexes`,
        ),
        createdAt: expectSessionDateString(source.createdAt, `${path}.createdAt`),
        inheritedConfig: cloneInheritedConfigFlags(source.inheritedConfig ?? {}, `${path}.inheritedConfig`),
        editedConfig: cloneEditedConfigFlags(source.editedConfig ?? {}, `${path}.editedConfig`),
    }
}

function buildLegacyTournamentSeriesFromSession(source, path) {
    const teamSize = expectInteger(source.tournamentTeamSize, `${path}.tournamentTeamSize`, 1)
    if (teamSize !== 1 && teamSize !== 2) {
        throw createValidationError(`${path}.tournamentTeamSize`, "must be 1 or 2.")
    }

    return {
        matchType: teamSize === 2 ? "doubles" : "singles",
        format: expectString(source.tournamentFormat, `${path}.tournamentFormat`),
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        courtHandling: "queue",
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
        seed: "legacy-series-seed",
        maxTournaments: 1,
        currentTournamentIndex: 0,
        tournaments: [
            {
                players: clonePlayerNameArray(source.players, `${path}.players`),
                tournamentLevelSitOuts: clonePlayerNameArray(
                    source.tournamentLevelSitOuts ?? [],
                    `${path}.tournamentLevelSitOuts`,
                ),
                rounds: cloneRounds(source.rounds, `${path}.rounds`),
                currentRound: expectInteger(source.currentRound ?? 0, `${path}.currentRound`),
                tournamentComplete: expectBoolean(source.tournamentComplete ?? false, `${path}.tournamentComplete`),
                tournamentFormat: expectString(source.tournamentFormat, `${path}.tournamentFormat`),
                tournamentTeamSize: teamSize,
                teams: (source.teams ?? []).map((team, index) => cloneTeamRecord(team, `${path}.teams[${index}]`)),
                seeding: expectString(source.seeding ?? "random", `${path}.seeding`),
                bracket: cloneBracket(source.bracket ?? null, `${path}.bracket`),
                tournamentRound: expectInteger(source.tournamentRound ?? 0, `${path}.tournamentRound`),
                allRoundsGenerated: expectBoolean(source.allRoundsGenerated ?? false, `${path}.allRoundsGenerated`),
            },
        ],
    }
}

function createOriginalPhaseContinuation(createdAt) {
    return {
        sourcePhaseIndex: null,
        sourceTournamentIndex: null,
        inheritedPhaseIndexes: [],
        addedPlayers: [],
        removedPlayers: [],
        abandonedFutureTournamentIndexes: [],
        createdAt,
        inheritedConfig: {
            format: false,
            teamSize: false,
            courtCount: false,
            allowNotStrictDoubles: false,
        },
        editedConfig: {
            courtCount: false,
            allowNotStrictDoubles: false,
        },
    }
}

function cloneTournamentPhase(value, path) {
    const source = expectPlainObject(value, path)
    return {
        id: expectString(source.id, `${path}.id`),
        createdAt: expectSessionDateString(source.createdAt, `${path}.createdAt`),
        players: clonePlayerNameArray(source.players, `${path}.players`),
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
        tournamentConfig: cloneTournamentConfig(source.tournamentConfig, `${path}.tournamentConfig`),
        tournamentSeries: cloneTournamentSeries(source.tournamentSeries, `${path}.tournamentSeries`),
        continuation: cloneContinuationMetadata(
            source.continuation ?? createOriginalPhaseContinuation(source.createdAt),
            `${path}.continuation`,
        ),
    }
}

function cloneTournamentPhases(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    if (value.length === 0) {
        throw createValidationError(path, "must contain at least one phase.")
    }
    return value.map((phase, index) => cloneTournamentPhase(phase, `${path}[${index}]`))
}

function buildLegacyTournamentPhase(source, path, sessionId, sessionDate) {
    if (source.tournamentSeries === undefined && source.tournamentFormat === undefined) {
        throw createValidationError(
            path,
            "must include phases or provide tournamentSeries or top-level tournament fields for legacy tournament sessions.",
        )
    }

    return {
        id: `${sessionId}-phase-0`,
        createdAt: sessionDate,
        players: clonePlayerNameArray(source.players, `${path}.players`),
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
        tournamentConfig:
            source.tournamentConfig === undefined
                ? deriveLegacyTournamentConfig(source, path)
                : cloneTournamentConfig(source.tournamentConfig, `${path}.tournamentConfig`),
        tournamentSeries:
            source.tournamentSeries === undefined
                ? buildLegacyTournamentSeriesFromSession(source, path)
                : cloneTournamentSeries(source.tournamentSeries, `${path}.tournamentSeries`),
        continuation: createOriginalPhaseContinuation(sessionDate),
    }
}

function cloneOrNormalizeTournamentPhases(source, path, sessionId, sessionDate) {
    if (source.phases !== undefined) {
        return {
            currentPhaseIndex: expectInteger(source.currentPhaseIndex ?? 0, `${path}.currentPhaseIndex`),
            phases: cloneTournamentPhases(source.phases, `${path}.phases`),
        }
    }

    return {
        currentPhaseIndex: 0,
        phases: [buildLegacyTournamentPhase(source, path, sessionId, sessionDate)],
    }
}

export { cloneContinuationMetadata, cloneOrNormalizeTournamentPhases, cloneTournamentPhase, cloneTournamentPhases }
