import { expectPlayerName, expectSessionDateString } from "./player.js"
import {
    createValidationError,
    expectInteger,
    expectNullableString,
    expectPlainObject,
    expectString,
} from "./shared.js"

const RATING_SEASON_STATUSES = new Set(["active", "archived"])

function cloneRatingTuning(value, path) {
    const source = expectPlainObject(value, path)
    return {
        establishedK: expectInteger(source.establishedK, `${path}.establishedK`, 1),
        provisionalK: expectInteger(source.provisionalK, `${path}.provisionalK`, 1),
        provisionalMatchThreshold: expectInteger(
            source.provisionalMatchThreshold,
            `${path}.provisionalMatchThreshold`,
            1,
        ),
    }
}

function cloneRatingSnapshotPlayer(value, path) {
    const source = expectPlainObject(value, path)
    return {
        rating: expectInteger(source.rating, `${path}.rating`),
        ratedMatchCount: expectInteger(source.ratedMatchCount, `${path}.ratedMatchCount`),
        wins: expectInteger(source.wins, `${path}.wins`),
        losses: expectInteger(source.losses, `${path}.losses`),
        provisional: source.provisional === true,
        seasonHigh: expectInteger(source.seasonHigh, `${path}.seasonHigh`),
        seasonLow: expectInteger(source.seasonLow, `${path}.seasonLow`),
        deltaFromStart: expectInteger(source.deltaFromStart, `${path}.deltaFromStart`, Number.MIN_SAFE_INTEGER),
    }
}

function cloneRatingSnapshotPlayers(value, path) {
    const source = expectPlainObject(value, path)
    const result = {}
    for (const [name, player] of Object.entries(source)) {
        const playerName = expectPlayerName(name, `${path} key`)
        result[playerName] = cloneRatingSnapshotPlayer(player, `${path}.${playerName}`)
    }
    return result
}

function cloneRatingSnapshot(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    const source = expectPlainObject(value, path)
    return {
        generatedAt: expectSessionDateString(source.generatedAt, `${path}.generatedAt`),
        players: cloneRatingSnapshotPlayers(source.players ?? {}, `${path}.players`),
        leaderboard: Object.entries(source.players ?? {}).length === 0 ? [] : cloneLeaderboard(source, path),
    }
}

function cloneLeaderboard(source, path) {
    if (!Array.isArray(source.leaderboard)) {
        throw createValidationError(`${path}.leaderboard`, "must be an array.")
    }
    return source.leaderboard.map((name, index) => expectPlayerName(name, `${path}.leaderboard[${index}]`))
}

function cloneRatingSnapshots(value, path) {
    const source = expectPlainObject(value, path)
    return {
        singles: cloneRatingSnapshot(source.singles ?? null, `${path}.singles`),
        doubles: cloneRatingSnapshot(source.doubles ?? null, `${path}.doubles`),
    }
}

function cloneRatingSeason(value, path) {
    const source = expectPlainObject(value, path)
    const status = expectString(source.status, `${path}.status`)
    if (!RATING_SEASON_STATUSES.has(status)) {
        throw createValidationError(`${path}.status`, "must be active or archived.")
    }
    const endedAt = expectNullableString(source.endedAt, `${path}.endedAt`)
    if (status === "active" && endedAt !== null) {
        throw createValidationError(`${path}.endedAt`, "must be null for an active season.")
    }
    if (status === "archived" && endedAt === null) {
        throw createValidationError(`${path}.endedAt`, "must be a valid date string for an archived season.")
    }
    return {
        id: expectString(source.id, `${path}.id`),
        label: expectString(source.label, `${path}.label`),
        startedAt: expectSessionDateString(source.startedAt, `${path}.startedAt`),
        endedAt: endedAt === null ? null : expectSessionDateString(endedAt, `${path}.endedAt`),
        status,
        baselineRating: expectInteger(source.baselineRating, `${path}.baselineRating`),
        tuning: cloneRatingTuning(source.tuning, `${path}.tuning`),
        snapshots: cloneRatingSnapshots(source.snapshots ?? {}, `${path}.snapshots`),
    }
}

function cloneRatingSeasons(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((season, index) => cloneRatingSeason(season, `${path}[${index}]`))
}

function validateRatingsStateShape(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    const source = expectPlainObject(value, path)
    const currentSeasonId = expectNullableString(source.currentSeasonId, `${path}.currentSeasonId`)
    const seasons = cloneRatingSeasons(source.seasons ?? [], `${path}.seasons`)
    const activeSeasons = seasons.filter((season) => season.status === "active")
    if (activeSeasons.length > 1) {
        throw createValidationError(`${path}.seasons`, "must not contain more than one active season.")
    }
    if (currentSeasonId === null) {
        if (activeSeasons.length > 0) {
            throw createValidationError(`${path}.currentSeasonId`, "must reference the active season when one exists.")
        }
    } else {
        const matchingSeason = seasons.find((season) => season.id === currentSeasonId)
        if (!matchingSeason) {
            throw createValidationError(`${path}.currentSeasonId`, "must reference an existing season.")
        }
        if (matchingSeason.status !== "active") {
            throw createValidationError(`${path}.currentSeasonId`, "must reference the active season.")
        }
    }
    return {
        currentSeasonId,
        seasons,
    }
}

export { validateRatingsStateShape }
