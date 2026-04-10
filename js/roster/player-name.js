import { getPlayerNameValidationError } from "../core/player-name.js"

function validateRosterPlayerName(name) {
    return getPlayerNameValidationError(name)
}

export { validateRosterPlayerName }
