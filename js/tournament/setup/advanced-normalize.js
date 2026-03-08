import {
    collectLockedPairKeySet,
    filterByeTeamsToLockedPairs,
    reconcileByeTeams,
    reconcilePairRows,
    toLockedTeamPlayers,
} from "./advanced-model-helpers.js"

function normalizeAdvancedForConfig(source, allowNotStrictDoubles = false) {
    const doublesLockedPairs = []
    for (const row of reconcilePairRows(source.doublesLockedPairs)) {
        const teamPlayers = toLockedTeamPlayers(row, allowNotStrictDoubles)
        if (!teamPlayers) {
            continue
        }
        if (teamPlayers.length === 1) {
            doublesLockedPairs.push([teamPlayers[0], ""])
            continue
        }
        doublesLockedPairs.push([teamPlayers[0], teamPlayers[1]])
    }

    const lockedPairKeySet = collectLockedPairKeySet(doublesLockedPairs, allowNotStrictDoubles)
    return {
        singlesOpeningMatchups: reconcilePairRows(source.singlesOpeningMatchups)
            .filter(([a, b]) => a && b)
            .map(([a, b]) => [a, b]),
        doublesLockedPairs,
        forcedSitOutPlayer: source.forcedSitOutPlayer || null,
        singlesByePlayers: [...new Set((source.singlesByePlayers || []).filter(Boolean))],
        doublesByeTeams: filterByeTeamsToLockedPairs(
            reconcileByeTeams(source.doublesByeTeams),
            lockedPairKeySet,
            allowNotStrictDoubles,
        ),
        singlesNextUpPlayers: [...new Set((source.singlesNextUpPlayers || []).filter(Boolean))],
        doublesNextUpTeams: filterByeTeamsToLockedPairs(
            reconcileByeTeams(source.doublesNextUpTeams),
            lockedPairKeySet,
            allowNotStrictDoubles,
        ),
    }
}

export { normalizeAdvancedForConfig }
