const RESERVED_PLAYER_NAME_DELIMITERS = ["||", ","]
const RESERVED_PLAYER_NAME_MESSAGE = 'Player names cannot contain "||" or ",".'

function hasReservedPlayerNameDelimiter(name) {
    return RESERVED_PLAYER_NAME_DELIMITERS.some((delimiter) => name.includes(delimiter))
}

function getPlayerNameValidationError(name) {
    if (typeof name !== "string" || name.trim().length === 0) {
        return ""
    }
    return hasReservedPlayerNameDelimiter(name) ? RESERVED_PLAYER_NAME_MESSAGE : ""
}

export { RESERVED_PLAYER_NAME_MESSAGE, getPlayerNameValidationError, hasReservedPlayerNameDelimiter }
