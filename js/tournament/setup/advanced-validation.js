import { getAdvancedEntrants } from "./advanced-context.js"
import { runAdvancedValidationChecks } from "./advanced-validation-rules.js"

function validateAdvancedDraft({
    advancedDraft,
    tournamentFormat,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
    courtCount = 1,
}) {
    const activePlayers = new Set(
        getAdvancedEntrants({
            selectedPlayers,
            tournamentTeamSize,
            allowNotStrictDoubles,
            minRequiredSitOutPool,
            forcedSitOutPlayer: advancedDraft.forcedSitOutPlayer,
        }),
    )
    return runAdvancedValidationChecks({
        advancedDraft,
        tournamentFormat,
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        courtCount,
        activePlayers,
    })
}

export { validateAdvancedDraft }
