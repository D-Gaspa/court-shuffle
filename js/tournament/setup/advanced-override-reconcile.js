import {
    collectLockedPairKeySet,
    filterByeTeamsToLockedPairs,
    getBracketByeSlotCount,
    normalizeTeamKey,
    normalizeTeamPlayers,
    reconcileByeTeams,
} from "./advanced-model-helpers.js"
import { isBracketFormat } from "./advanced-rules.js"

function reconcileByeSelectionsForContext({
    tournamentAdvanced,
    tournamentTeamSize,
    tournamentFormat,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    if (!isBracketFormat(tournamentFormat)) {
        tournamentAdvanced.singlesByePlayers = []
        tournamentAdvanced.doublesByeTeams = []
        return
    }

    const byeSlotCount = getBracketByeSlotCount({
        selectedPlayers,
        tournamentTeamSize,
        allowNotStrictDoubles,
        minRequiredSitOutPool,
    })
    if (byeSlotCount <= 0) {
        tournamentAdvanced.singlesByePlayers = []
        tournamentAdvanced.doublesByeTeams = []
        return
    }

    if (tournamentTeamSize === 1) {
        tournamentAdvanced.singlesByePlayers = [...new Set(tournamentAdvanced.singlesByePlayers.filter(Boolean))].slice(
            0,
            byeSlotCount,
        )
        return
    }

    tournamentAdvanced.doublesByeTeams = reconcileByeTeams(tournamentAdvanced.doublesByeTeams)
        .filter((team) => team.length > 0)
        .slice(0, byeSlotCount)
}

function reconcileNextUpSelectionsForContext({
    tournamentAdvanced,
    tournamentTeamSize,
    nextUpSlotCount,
    allowNotStrictDoubles,
}) {
    if (nextUpSlotCount <= 0) {
        tournamentAdvanced.singlesNextUpPlayers = []
        tournamentAdvanced.doublesNextUpTeams = []
        return
    }

    if (tournamentTeamSize === 1) {
        const byePlayers = new Set(tournamentAdvanced.singlesByePlayers || [])
        tournamentAdvanced.singlesNextUpPlayers = [...new Set(tournamentAdvanced.singlesNextUpPlayers.filter(Boolean))]
            .filter((player) => !byePlayers.has(player))
            .slice(0, nextUpSlotCount)
        return
    }

    const byeKeys = new Set(
        (tournamentAdvanced.doublesByeTeams || []).map((team) => normalizeTeamKey(normalizeTeamPlayers(team))),
    )
    tournamentAdvanced.doublesNextUpTeams = filterByeTeamsToLockedPairs(
        reconcileByeTeams(tournamentAdvanced.doublesNextUpTeams)
            .filter((team) => team.length > 0)
            .filter((team) => !byeKeys.has(normalizeTeamKey(normalizeTeamPlayers(team))))
            .slice(0, nextUpSlotCount),
        collectLockedPairKeySet(tournamentAdvanced.doublesLockedPairs, allowNotStrictDoubles),
        allowNotStrictDoubles,
    )
}

export { reconcileByeSelectionsForContext, reconcileNextUpSelectionsForContext }
