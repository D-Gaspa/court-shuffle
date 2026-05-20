import { expectPlayerName } from "./player.js"

const MIN_TEAM_ROW_LENGTH = 1
const MAX_TEAM_ROW_LENGTH = 2

function createValidationError(path, message) {
    return new Error(`${path} ${message}`)
}

function isOptionalEmptySlot(value) {
    return value === "" || value === undefined
}

function expectOptionalPlayerName(value, path) {
    return isOptionalEmptySlot(value) ? "" : expectPlayerName(value, path)
}

function assertDoublesTeamRowShape(team, path) {
    if (!(Array.isArray(team) && team.length >= MIN_TEAM_ROW_LENGTH && team.length <= MAX_TEAM_ROW_LENGTH)) {
        throw createValidationError(path, "must be a one- or two-player row.")
    }
}

function normalizeDoublesTeamRow(team, path) {
    assertDoublesTeamRowShape(team, path)

    const first = expectOptionalPlayerName(team[0], `${path}[0]`)
    const second = expectOptionalPlayerName(team[1], `${path}[1]`)
    if (!(first || second)) {
        throw createValidationError(path, "must contain at least one player name.")
    }
    if (first && second && first === second) {
        throw createValidationError(path, "must contain different player names.")
    }

    return first ? [first, second] : [second, ""]
}

function cloneDoublesTeamRows(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((team, index) => normalizeDoublesTeamRow(team, `${path}[${index}]`))
}

export { cloneDoublesTeamRows }
