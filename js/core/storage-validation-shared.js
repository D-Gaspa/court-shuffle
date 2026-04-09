const SESSION_MODES = new Set(["free", "singles", "doubles", "tournament"])
const TOURNAMENT_FORMATS = new Set(["elimination", "consolation", "round-robin"])
const TOURNAMENT_MATCH_TYPES = new Set(["singles", "doubles"])
const TOURNAMENT_POOLS = new Set(["winners", "losers"])

const MIN_TEAM_ROW_LENGTH = 1
const MAX_TEAM_ROW_LENGTH = 2
const MIN_SET_SCORE_LENGTH = 2
const MAX_SET_SCORE_LENGTH = 3
const MIN_MATCH_TEAM_COUNT = 1

function createValidationError(path, message) {
    return new Error(`${path} ${message}`)
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function expectPlainObject(value, path) {
    if (!isPlainObject(value)) {
        throw createValidationError(path, "must be an object.")
    }
    return value
}

function expectString(value, path) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createValidationError(path, "must be a non-empty string.")
    }
    return value
}

function expectNullableString(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    return expectString(value, path)
}

function expectBoolean(value, path) {
    if (typeof value !== "boolean") {
        throw createValidationError(path, "must be a boolean.")
    }
    return value
}

function expectInteger(value, path, minimum = 0) {
    if (!Number.isInteger(value) || value < minimum) {
        throw createValidationError(path, `must be an integer greater than or equal to ${minimum}.`)
    }
    return value
}

function cloneStringArray(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((item, index) => expectString(item, `${path}[${index}]`))
}

function cloneIntegerArray(value, path, minimum = 0) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((item, index) => expectInteger(item, `${path}[${index}]`, minimum))
}

function clonePairRows(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((pair, index) => {
        if (!(Array.isArray(pair) && pair.length === 2)) {
            throw createValidationError(`${path}[${index}]`, "must be a two-player row.")
        }
        return [expectString(pair[0], `${path}[${index}][0]`), expectString(pair[1], `${path}[${index}][1]`)]
    })
}

function cloneTeamRows(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((team, index) => {
        const players = cloneStringArray(team, `${path}[${index}]`)
        if (players.length === 0 || players.length > MAX_TEAM_ROW_LENGTH) {
            throw createValidationError(`${path}[${index}]`, "must contain one or two player names.")
        }
        return players
    })
}

function cloneTeamPlayers(value, path) {
    const players = cloneStringArray(value, path)
    if (players.length < MIN_TEAM_ROW_LENGTH) {
        throw createValidationError(path, "must contain at least one player.")
    }
    return players
}

function cloneAdvancedSettings(value, path) {
    const source = expectPlainObject(value, path)
    return {
        singlesOpeningMatchups: clonePairRows(source.singlesOpeningMatchups ?? [], `${path}.singlesOpeningMatchups`),
        doublesLockedPairs: clonePairRows(source.doublesLockedPairs ?? [], `${path}.doublesLockedPairs`),
        doublesRestrictedTeams: clonePairRows(source.doublesRestrictedTeams ?? [], `${path}.doublesRestrictedTeams`),
        forcedSitOutPlayer: expectNullableString(source.forcedSitOutPlayer, `${path}.forcedSitOutPlayer`),
        singlesByePlayers: cloneStringArray(source.singlesByePlayers ?? [], `${path}.singlesByePlayers`),
        doublesByeTeams: cloneTeamRows(source.doublesByeTeams ?? [], `${path}.doublesByeTeams`),
        singlesNextUpPlayers: cloneStringArray(source.singlesNextUpPlayers ?? [], `${path}.singlesNextUpPlayers`),
        doublesNextUpTeams: cloneTeamRows(source.doublesNextUpTeams ?? [], `${path}.doublesNextUpTeams`),
    }
}

function cloneSetScore(value, path) {
    const hasValidLength =
        Array.isArray(value) && value.length >= MIN_SET_SCORE_LENGTH && value.length <= MAX_SET_SCORE_LENGTH
    if (!hasValidLength) {
        throw createValidationError(path, "must be a set score tuple.")
    }

    const teamA = value[0] === null ? null : expectInteger(value[0], `${path}[0]`)
    const teamB = value[1] === null ? null : expectInteger(value[1], `${path}[1]`)

    if (value.length === MIN_SET_SCORE_LENGTH || value[2] === undefined) {
        return [teamA, teamB]
    }

    const metadata = expectPlainObject(value[2], `${path}[2]`)
    if (!(Array.isArray(metadata.tb) && metadata.tb.length === 2)) {
        throw createValidationError(`${path}[2].tb`, "must be a two-value tiebreak tuple.")
    }

    return [
        teamA,
        teamB,
        {
            tb: [
                metadata.tb[0] === null ? null : expectInteger(metadata.tb[0], `${path}[2].tb[0]`),
                metadata.tb[1] === null ? null : expectInteger(metadata.tb[1], `${path}[2].tb[1]`),
            ],
        },
    ]
}

function cloneScoreEntry(value, path) {
    const source = expectPlainObject(value, path)
    const next = {}

    if (Object.hasOwn(source, "court") && source.court !== null && source.court !== undefined) {
        next.court = expectInteger(source.court, `${path}.court`, 1)
    }
    if (Object.hasOwn(source, "sets")) {
        if (!Array.isArray(source.sets)) {
            throw createValidationError(`${path}.sets`, "must be an array.")
        }
        next.sets = source.sets.map((setScore, index) => cloneSetScore(setScore, `${path}.sets[${index}]`))
    }
    if (Object.hasOwn(source, "score")) {
        if (!(Array.isArray(source.score) && source.score.length === 2)) {
            throw createValidationError(`${path}.score`, "must be a two-value score tuple.")
        }
        next.score = [
            source.score[0] === null ? null : expectInteger(source.score[0], `${path}.score[0]`),
            source.score[1] === null ? null : expectInteger(source.score[1], `${path}.score[1]`),
        ]
    }

    if (!(Object.hasOwn(next, "sets") || Object.hasOwn(next, "score"))) {
        throw createValidationError(path, "must contain score data.")
    }

    return next
}

function cloneScores(value, path) {
    if (value === null) {
        return null
    }
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array or null.")
    }
    return value.map((entry, index) => (entry === null ? null : cloneScoreEntry(entry, `${path}[${index}]`)))
}

function cloneMatch(value, path) {
    const source = expectPlainObject(value, path)
    const teams = Array.isArray(source.teams)
        ? source.teams.map((team, index) => cloneTeamPlayers(team, `${path}.teams[${index}]`))
        : null

    if (!(teams && teams.length > MIN_MATCH_TEAM_COUNT - 1)) {
        throw createValidationError(`${path}.teams`, "must contain at least one team.")
    }

    const next = { teams }
    if (Object.hasOwn(source, "court") && source.court !== null && source.court !== undefined) {
        next.court = expectInteger(source.court, `${path}.court`, 1)
    }
    if (Object.hasOwn(source, "teamIds") && source.teamIds !== null && source.teamIds !== undefined) {
        next.teamIds = cloneIntegerArray(source.teamIds, `${path}.teamIds`)
    }
    if (Object.hasOwn(source, "bracketPool") && source.bracketPool !== null && source.bracketPool !== undefined) {
        const pool = expectString(source.bracketPool, `${path}.bracketPool`)
        if (!TOURNAMENT_POOLS.has(pool)) {
            throw createValidationError(`${path}.bracketPool`, "must be a supported tournament pool.")
        }
        next.bracketPool = pool
    }
    if (Object.hasOwn(source, "headerLabel") && source.headerLabel !== null && source.headerLabel !== undefined) {
        next.headerLabel = expectString(source.headerLabel, `${path}.headerLabel`)
    }
    return next
}

function cloneCourtSchedule(value, path) {
    const source = expectPlainObject(value, path)
    return {
        courtCount: expectInteger(source.courtCount, `${path}.courtCount`, 1),
        mode: expectString(source.mode, `${path}.mode`),
    }
}

function cloneRound(value, path) {
    const source = expectPlainObject(value, path)
    if (!Array.isArray(source.matches)) {
        throw createValidationError(`${path}.matches`, "must be an array.")
    }

    const next = {
        matches: source.matches.map((match, index) => cloneMatch(match, `${path}.matches[${index}]`)),
        sitOuts: cloneStringArray(source.sitOuts ?? [], `${path}.sitOuts`),
        scores: cloneScores(source.scores ?? null, `${path}.scores`),
        byes: cloneIntegerArray(source.byes ?? [], `${path}.byes`),
        losersByes: cloneIntegerArray(source.losersByes ?? [], `${path}.losersByes`),
    }

    if (source.tournamentRoundLabel !== undefined && source.tournamentRoundLabel !== null) {
        next.tournamentRoundLabel = expectString(source.tournamentRoundLabel, `${path}.tournamentRoundLabel`)
    }
    if (source.courtSchedule !== undefined && source.courtSchedule !== null) {
        next.courtSchedule = cloneCourtSchedule(source.courtSchedule, `${path}.courtSchedule`)
    }
    return next
}

function cloneRounds(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((round, index) => cloneRound(round, `${path}[${index}]`))
}

function cloneTeamRecord(value, path) {
    const source = expectPlainObject(value, path)
    return {
        id: expectInteger(source.id, `${path}.id`),
        name: expectString(source.name, `${path}.name`),
        players: cloneTeamPlayers(source.players, `${path}.players`),
    }
}

export {
    SESSION_MODES,
    TOURNAMENT_FORMATS,
    TOURNAMENT_MATCH_TYPES,
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
}
