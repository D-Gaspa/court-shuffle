import { clonePlayerNameArray, expectPlayerName } from "./storage-validation-player.js"
import {
    cloneAdvancedSettings,
    cloneIntegerArray,
    cloneRounds,
    cloneStringArray,
    cloneTeamRecord,
    createValidationError,
    expectBoolean,
    expectInteger,
    expectNullableString,
    expectPlainObject,
    expectString,
    SESSION_MODES,
    TOURNAMENT_FORMATS,
    TOURNAMENT_MATCH_TYPES,
} from "./storage-validation-shared.js"

function cloneBracket(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    const source = expectPlainObject(value, path)
    const poolsSource =
        source.pools === undefined || source.pools === null ? {} : expectPlainObject(source.pools, `${path}.pools`)
    const standings =
        source.standings === undefined || source.standings === null
            ? {}
            : expectPlainObject(source.standings, `${path}.standings`)

    return {
        pools: {
            winners: cloneIntegerArray(poolsSource.winners ?? [], `${path}.pools.winners`),
            losers: cloneIntegerArray(poolsSource.losers ?? [], `${path}.pools.losers`),
        },
        eliminated: cloneIntegerArray(source.eliminated ?? [], `${path}.eliminated`),
        champion:
            source.champion === null || source.champion === undefined
                ? null
                : expectInteger(source.champion, `${path}.champion`),
        standings: { ...standings },
    }
}

function cloneTournamentConfig(value, path) {
    const source = expectPlainObject(value, path)
    const format = expectString(source.format, `${path}.format`)
    if (!TOURNAMENT_FORMATS.has(format)) {
        throw createValidationError(`${path}.format`, "must be a supported tournament format.")
    }

    const teamSize = expectInteger(source.teamSize, `${path}.teamSize`, 1)
    if (teamSize !== 1 && teamSize !== 2) {
        throw createValidationError(`${path}.teamSize`, "must be 1 or 2.")
    }

    return {
        format,
        teamSize,
        courtCount: expectInteger(source.courtCount, `${path}.courtCount`, 1),
        courtHandling: expectString(source.courtHandling ?? "queue", `${path}.courtHandling`),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
        advanced: cloneAdvancedSettings(source.advanced ?? {}, `${path}.advanced`),
        seed: expectNullableString(source.seed, `${path}.seed`),
    }
}

function cloneTournamentConstraints(value, path) {
    const source = expectPlainObject(value, path)
    const sitOutCountsSource = expectPlainObject(source.tournamentSitOutCounts ?? {}, `${path}.tournamentSitOutCounts`)
    const tournamentSitOutCounts = {}

    for (const [player, count] of Object.entries(sitOutCountsSource)) {
        tournamentSitOutCounts[expectPlayerName(player, `${path}.tournamentSitOutCounts key`)] = expectInteger(
            count,
            `${path}.tournamentSitOutCounts.${player}`,
        )
    }

    return {
        usedDoublesPartnerPairs: cloneStringArray(
            source.usedDoublesPartnerPairs ?? [],
            `${path}.usedDoublesPartnerPairs`,
        ),
        usedDoublesTeamKeys: cloneStringArray(source.usedDoublesTeamKeys ?? [], `${path}.usedDoublesTeamKeys`),
        usedSinglesOpeningMatchups: cloneStringArray(
            source.usedSinglesOpeningMatchups ?? [],
            `${path}.usedSinglesOpeningMatchups`,
        ),
        tournamentSitOutCounts,
    }
}

function validateTournamentRunFormat(source, path) {
    const format = expectString(source.tournamentFormat, `${path}.tournamentFormat`)
    if (!TOURNAMENT_FORMATS.has(format)) {
        throw createValidationError(`${path}.tournamentFormat`, "must be a supported tournament format.")
    }

    const teamSize = expectInteger(source.tournamentTeamSize, `${path}.tournamentTeamSize`, 1)
    if (teamSize !== 1 && teamSize !== 2) {
        throw createValidationError(`${path}.tournamentTeamSize`, "must be 1 or 2.")
    }

    return { format, teamSize }
}

function cloneOptionalTournamentRunFlags(source, path, next) {
    if (source.index !== undefined && source.index !== null) {
        next.index = expectInteger(source.index, `${path}.index`)
    }
    if (source.skipped !== undefined && source.skipped !== null) {
        next.skipped = expectBoolean(source.skipped, `${path}.skipped`)
    }
}

function cloneTournamentRun(value, path) {
    const source = expectPlainObject(value, path)
    const { format, teamSize } = validateTournamentRunFormat(source, path)

    if (source.teams !== undefined && !Array.isArray(source.teams)) {
        throw createValidationError(`${path}.teams`, "must be an array.")
    }

    const next = {
        players: clonePlayerNameArray(source.players, `${path}.players`),
        tournamentLevelSitOuts: clonePlayerNameArray(
            source.tournamentLevelSitOuts ?? [],
            `${path}.tournamentLevelSitOuts`,
        ),
        rounds: cloneRounds(source.rounds, `${path}.rounds`),
        currentRound: expectInteger(source.currentRound ?? 0, `${path}.currentRound`),
        tournamentComplete: expectBoolean(source.tournamentComplete ?? false, `${path}.tournamentComplete`),
        tournamentFormat: format,
        tournamentTeamSize: teamSize,
        teams: (source.teams ?? []).map((team, index) => cloneTeamRecord(team, `${path}.teams[${index}]`)),
        seeding: expectString(source.seeding ?? "random", `${path}.seeding`),
        bracket: cloneBracket(source.bracket ?? null, `${path}.bracket`),
        tournamentRound: expectInteger(source.tournamentRound ?? 0, `${path}.tournamentRound`),
        allRoundsGenerated: expectBoolean(source.allRoundsGenerated ?? false, `${path}.allRoundsGenerated`),
    }

    cloneOptionalTournamentRunFlags(source, path, next)
    return next
}

function cloneTournamentSeries(value, path) {
    const source = expectPlainObject(value, path)
    const matchType = expectString(source.matchType, `${path}.matchType`)
    if (!TOURNAMENT_MATCH_TYPES.has(matchType)) {
        throw createValidationError(`${path}.matchType`, "must be singles or doubles.")
    }

    const format = expectString(source.format, `${path}.format`)
    if (!TOURNAMENT_FORMATS.has(format)) {
        throw createValidationError(`${path}.format`, "must be a supported tournament format.")
    }

    if (source.tournaments !== undefined && !Array.isArray(source.tournaments)) {
        throw createValidationError(`${path}.tournaments`, "must be an array.")
    }

    const next = {
        matchType,
        format,
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        courtHandling: expectString(source.courtHandling ?? "queue", `${path}.courtHandling`),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
        seed: expectString(source.seed ?? "series-seed", `${path}.seed`),
        maxTournaments: expectInteger(source.maxTournaments, `${path}.maxTournaments`, 1),
        currentTournamentIndex: expectInteger(source.currentTournamentIndex ?? 0, `${path}.currentTournamentIndex`),
        tournaments:
            source.tournaments === undefined
                ? []
                : source.tournaments.map((run, index) => cloneTournamentRun(run, `${path}.tournaments[${index}]`)),
        constraints:
            source.constraints === undefined || source.constraints === null
                ? undefined
                : cloneTournamentConstraints(source.constraints, `${path}.constraints`),
    }

    return next
}

function cloneStructuredConfig(value, path) {
    const source = expectPlainObject(value, path)
    const mode = expectString(source.mode, `${path}.mode`)
    if (!(mode === "singles" || mode === "doubles")) {
        throw createValidationError(`${path}.mode`, "must be singles or doubles.")
    }
    return {
        mode,
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        allowNotStrictDoubles: expectBoolean(source.allowNotStrictDoubles ?? false, `${path}.allowNotStrictDoubles`),
    }
}

function cloneFreeConfig(value, path) {
    const source = expectPlainObject(value, path)
    return {
        teamCount: expectInteger(source.teamCount ?? 2, `${path}.teamCount`, 1),
    }
}

function cloneRemix(value, path) {
    const source = expectPlainObject(value, path)
    const mode = expectString(source.sourceMode, `${path}.sourceMode`)
    if (!SESSION_MODES.has(mode)) {
        throw createValidationError(`${path}.sourceMode`, "must be a supported session mode.")
    }

    const next = {
        version: expectInteger(source.version ?? 1, `${path}.version`, 1),
        sourceMode: mode,
        players: clonePlayerNameArray(source.players ?? [], `${path}.players`),
    }

    if (source.tournamentConfig !== undefined) {
        next.tournamentConfig = cloneTournamentConfig(source.tournamentConfig, `${path}.tournamentConfig`)
    }
    if (source.structuredConfig !== undefined) {
        next.structuredConfig = cloneStructuredConfig(source.structuredConfig, `${path}.structuredConfig`)
    }
    if (source.freeConfig !== undefined) {
        next.freeConfig = cloneFreeConfig(source.freeConfig, `${path}.freeConfig`)
    }

    return next
}

export {
    cloneBracket,
    cloneFreeConfig,
    cloneRemix,
    cloneStructuredConfig,
    cloneTournamentConfig,
    cloneTournamentSeries,
}
