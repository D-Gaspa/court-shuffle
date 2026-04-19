import { clonePlayerNameArray, expectSessionDateString } from "./storage-validation-player.js"
import { validateRatingsStateShape } from "./storage-validation-ratings.js"
import { cloneSessionSummary } from "./storage-validation-session-summary.js"
import {
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
} from "./storage-validation-shared.js"
import {
    cloneBracket,
    cloneRemix,
    cloneTournamentConfig,
    cloneTournamentSeries,
} from "./storage-validation-tournament.js"
import { cloneOrNormalizeTournamentPhases } from "./storage-validation-tournament-phases.js"

function validateSessionMode(source, path) {
    const mode = expectString(source.mode, `${path}.mode`)
    if (!SESSION_MODES.has(mode)) {
        throw createValidationError(`${path}.mode`, "must be a supported session mode.")
    }
    return mode
}

function createBaseSessionRecord(source, path, mode) {
    return {
        id: expectString(source.id, `${path}.id`),
        date: expectSessionDateString(source.date, `${path}.date`),
        players: clonePlayerNameArray(source.players, `${path}.players`),
        teamCount: expectInteger(source.teamCount ?? 2, `${path}.teamCount`, 1),
        mode,
        courtCount: expectInteger(source.courtCount ?? 1, `${path}.courtCount`, 1),
        rounds: cloneRounds(source.rounds, `${path}.rounds`),
    }
}

function validateCurrentRound(next, path) {
    if (next.currentRound === undefined) {
        return
    }
    if (next.rounds.length === 0 || next.currentRound >= next.rounds.length) {
        throw createValidationError(`${path}.currentRound`, "must reference an existing round.")
    }
}

function validateTournamentSeries(next, path) {
    const series = next.tournamentSeries
    if (!series) {
        return
    }
    if (series.tournaments.length === 0) {
        throw createValidationError(`${path}.tournamentSeries.tournaments`, "must contain at least one tournament.")
    }
    if (series.currentTournamentIndex >= series.tournaments.length) {
        throw createValidationError(
            `${path}.tournamentSeries.currentTournamentIndex`,
            "must reference an existing tournament.",
        )
    }
    for (let index = 0; index < series.tournaments.length; index += 1) {
        const run = series.tournaments[index]
        if (run.rounds.length === 0 || run.currentRound >= run.rounds.length) {
            throw createValidationError(
                `${path}.tournamentSeries.tournaments[${index}].currentRound`,
                "must reference an existing round.",
            )
        }
    }
}

function validateTournamentPhases(next, path) {
    if (!(next.mode === "tournament" && Array.isArray(next.phases))) {
        return
    }
    if (next.currentPhaseIndex >= next.phases.length) {
        throw createValidationError(`${path}.currentPhaseIndex`, "must reference an existing phase.")
    }
    const requireStrictTournamentIndexes = path === "state.activeSession"
    for (let index = 0; index < next.phases.length; index += 1) {
        const phase = next.phases[index]
        if (phase.tournamentSeries.tournaments.length === 0) {
            throw createValidationError(
                `${path}.phases[${index}].tournamentSeries.tournaments`,
                "must contain at least one tournament.",
            )
        }
        if (
            requireStrictTournamentIndexes &&
            phase.tournamentSeries.currentTournamentIndex >= phase.tournamentSeries.tournaments.length
        ) {
            throw createValidationError(
                `${path}.phases[${index}].tournamentSeries.currentTournamentIndex`,
                "must reference an existing tournament.",
            )
        }
    }
}

function applyOptionalSessionTeams(source, path, next) {
    if (source.teams === undefined) {
        return
    }
    if (!Array.isArray(source.teams)) {
        throw createValidationError(`${path}.teams`, "must be an array.")
    }
    next.teams = source.teams.map((team, index) => cloneTeamRecord(team, `${path}.teams[${index}]`))
}

function applyOptionalTournamentFields(source, path, next) {
    const optionalFieldReaders = {
        currentRound: (value) => expectInteger(value, `${path}.currentRound`),
        allowNotStrictDoubles: (value) => expectBoolean(value, `${path}.allowNotStrictDoubles`),
        usedPairs: (value) => cloneStringArray(value, `${path}.usedPairs`),
        seeding: (value) => expectString(value, `${path}.seeding`),
        bracket: (value) => cloneBracket(value, `${path}.bracket`),
        tournamentRound: (value) => expectInteger(value, `${path}.tournamentRound`),
        allRoundsGenerated: (value) => expectBoolean(value, `${path}.allRoundsGenerated`),
        tournamentComplete: (value) => expectBoolean(value, `${path}.tournamentComplete`),
        tournamentLevelSitOuts: (value) => cloneStringArray(value, `${path}.tournamentLevelSitOuts`),
        tournamentSeries: (value) => cloneTournamentSeries(value, `${path}.tournamentSeries`),
        tournamentConfig: (value) => cloneTournamentConfig(value, `${path}.tournamentConfig`),
        remix: (value) => cloneRemix(value, `${path}.remix`),
        provisional: (value) => expectBoolean(value, `${path}.provisional`),
        sessionSummary: (value) => cloneSessionSummary(value, `${path}.sessionSummary`),
    }

    for (const [field, reader] of Object.entries(optionalFieldReaders)) {
        if (source[field] !== undefined) {
            next[field] = reader(source[field])
        }
    }

    if (next.mode === "tournament") {
        const phaseData = cloneOrNormalizeTournamentPhases(source, path, next.id, next.date)
        next.currentPhaseIndex = phaseData.currentPhaseIndex
        next.phases = phaseData.phases
    }

    if (source.night !== undefined) {
        const night = expectPlainObject(source.night, `${path}.night`)
        next.night = {
            previousSessionId: expectNullableString(night.previousSessionId ?? null, `${path}.night.previousSessionId`),
        }
    }
}

function applyOptionalTournamentSettings(source, path, next) {
    if (source.tournamentFormat !== undefined && source.tournamentFormat !== null) {
        next.tournamentFormat = expectString(source.tournamentFormat, `${path}.tournamentFormat`)
    }
    if (source.tournamentTeamSize !== undefined && source.tournamentTeamSize !== null) {
        const teamSize = expectInteger(source.tournamentTeamSize, `${path}.tournamentTeamSize`, 1)
        if (teamSize !== 1 && teamSize !== 2) {
            throw createValidationError(`${path}.tournamentTeamSize`, "must be 1 or 2.")
        }
        next.tournamentTeamSize = teamSize
    }
}

function cloneSessionRecord(value, path) {
    const source = expectPlainObject(value, path)
    const mode = validateSessionMode(source, path)
    const next = createBaseSessionRecord(source, path, mode)

    applyOptionalSessionTeams(source, path, next)
    applyOptionalTournamentSettings(source, path, next)
    applyOptionalTournamentFields(source, path, next)
    if (path === "state.activeSession") {
        validateCurrentRound(next, path)
        validateTournamentSeries(next, path)
    }
    validateTournamentPhases(next, path)
    return next
}

function cloneOptionalSessionRecord(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    return cloneSessionRecord(value, path)
}

function cloneSessionCollection(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((session, index) => cloneSessionRecord(session, `${path}[${index}]`))
}

function validateStateShape(value, path = "state") {
    const source = expectPlainObject(value, path)
    return {
        roster: clonePlayerNameArray(source.roster ?? [], `${path}.roster`),
        activeSession: cloneOptionalSessionRecord(source.activeSession ?? null, `${path}.activeSession`),
        history: cloneSessionCollection(source.history ?? [], `${path}.history`),
        archivedHistory: cloneSessionCollection(source.archivedHistory ?? [], `${path}.archivedHistory`),
        ratings: validateRatingsStateShape(source.ratings ?? null, `${path}.ratings`),
        lastExportedAt: expectNullableString(source.lastExportedAt, `${path}.lastExportedAt`),
    }
}

export { validateStateShape }
