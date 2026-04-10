import { getPlayerNameValidationError } from "./player-name.js"

function createValidationError(path, message) {
    return new Error(`${path} ${message}`)
}

function expectNonEmptyString(value, path) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createValidationError(path, "must be a non-empty string.")
    }
    return value
}

function expectPlayerName(value, path) {
    const name = expectNonEmptyString(value, path)
    const validationError = getPlayerNameValidationError(name)
    if (validationError) {
        throw createValidationError(path, 'must not contain "||" or ",".')
    }
    return name
}

function expectNullablePlayerName(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    return expectPlayerName(value, path)
}

function expectSessionDateString(value, path) {
    const dateValue = expectNonEmptyString(value, path)
    const parsed = new Date(dateValue)
    if (Number.isNaN(parsed.getTime())) {
        throw createValidationError(path, "must be a valid date string.")
    }
    return dateValue
}

function clonePlayerNameArray(value, path) {
    if (!Array.isArray(value)) {
        throw createValidationError(path, "must be an array.")
    }
    return value.map((item, index) => expectPlayerName(item, `${path}[${index}]`))
}

export { clonePlayerNameArray, expectNullablePlayerName, expectPlayerName, expectSessionDateString }
