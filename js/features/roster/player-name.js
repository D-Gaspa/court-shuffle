import { getPlayerNameValidationError } from "../../platform/player-name/validation.js"

function validateRosterPlayerName(name) {
    return getPlayerNameValidationError(name)
}

export { validateRosterPlayerName }
