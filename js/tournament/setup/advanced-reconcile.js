import { getAdvancedEntrants, getRoundOneQueueTeamSlotCount } from "./advanced-context.js"
import {
    collectLockedPairKeySet,
    filterByeTeamsToLockedPairs,
    reconcileByeTeams,
    reconcilePairRows,
    toLockedTeamPlayers,
} from "./advanced-model-helpers.js"
import { reconcileByeSelectionsForContext, reconcileNextUpSelectionsForContext } from "./advanced-override-reconcile.js"
import { isBracketFormat, requiresForcedSitOut } from "./advanced-rules.js"
import { reconcileSinglesOpeningAvailability } from "./advanced-singles-opening.js"

function reconcileAdvancedForSelection(tournamentAdvanced, selectedPlayers, allowNotStrictDoubles = true) {
    const selected = new Set(selectedPlayers)

    tournamentAdvanced.singlesOpeningMatchups = reconcilePairRows(tournamentAdvanced.singlesOpeningMatchups, true).map(
        ([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""],
    )
    tournamentAdvanced.doublesLockedPairs = reconcilePairRows(tournamentAdvanced.doublesLockedPairs, true).map(
        ([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""],
    )
    tournamentAdvanced.doublesRestrictedTeams = reconcilePairRows(tournamentAdvanced.doublesRestrictedTeams, true).map(
        ([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""],
    )

    const lockedPairKeySet = collectLockedPairKeySet(tournamentAdvanced.doublesLockedPairs, allowNotStrictDoubles)
    tournamentAdvanced.singlesByePlayers = tournamentAdvanced.singlesByePlayers.filter((player) => selected.has(player))
    tournamentAdvanced.singlesNextUpPlayers = tournamentAdvanced.singlesNextUpPlayers.filter((player) =>
        selected.has(player),
    )

    const reconcileLockedTeamSelection = (teams) =>
        filterByeTeamsToLockedPairs(
            reconcileByeTeams(teams)
                .map((team) => team.filter((player) => selected.has(player)))
                .filter((team) => team.length > 0),
            lockedPairKeySet,
            allowNotStrictDoubles,
        )

    tournamentAdvanced.doublesByeTeams = reconcileLockedTeamSelection(tournamentAdvanced.doublesByeTeams)
    tournamentAdvanced.doublesNextUpTeams = reconcileLockedTeamSelection(tournamentAdvanced.doublesNextUpTeams)

    if (tournamentAdvanced.forcedSitOutPlayer && !selected.has(tournamentAdvanced.forcedSitOutPlayer)) {
        tournamentAdvanced.forcedSitOutPlayer = null
    }
}

function reconcileAdvancedForEntrants({
    tournamentAdvanced,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    if (tournamentTeamSize !== 2) {
        return
    }

    const activeEntrants = new Set(
        getAdvancedEntrants({
            selectedPlayers,
            tournamentTeamSize,
            allowNotStrictDoubles,
            minRequiredSitOutPool,
            forcedSitOutPlayer: tournamentAdvanced.forcedSitOutPlayer,
        }),
    )
    tournamentAdvanced.doublesLockedPairs = reconcilePairRows(tournamentAdvanced.doublesLockedPairs, true).map(
        ([a, b]) => [activeEntrants.has(a) ? a : "", activeEntrants.has(b) ? b : ""],
    )
    tournamentAdvanced.doublesRestrictedTeams = reconcilePairRows(tournamentAdvanced.doublesRestrictedTeams, true).map(
        ([a, b]) => [activeEntrants.has(a) ? a : "", activeEntrants.has(b) ? b : ""],
    )

    const lockedPairKeySet = collectLockedPairKeySet(tournamentAdvanced.doublesLockedPairs, allowNotStrictDoubles)
    const reconcileActiveTeams = (teams) =>
        filterByeTeamsToLockedPairs(
            reconcileByeTeams(teams)
                .map((team) => team.filter((player) => activeEntrants.has(player)))
                .filter((team) => team.length > 0),
            lockedPairKeySet,
            allowNotStrictDoubles,
        )

    tournamentAdvanced.doublesByeTeams = reconcileActiveTeams(tournamentAdvanced.doublesByeTeams)
    tournamentAdvanced.doublesNextUpTeams = reconcileActiveTeams(tournamentAdvanced.doublesNextUpTeams)
}

function finalizeSinglesOpeningRows(tournamentAdvanced, preserveIncompleteRows) {
    reconcileSinglesOpeningAvailability(tournamentAdvanced)
    tournamentAdvanced.singlesOpeningMatchups = reconcilePairRows(
        tournamentAdvanced.singlesOpeningMatchups,
        preserveIncompleteRows,
    ).filter(([a, b]) => preserveIncompleteRows || (a && b))
}

function finalizeDoublesLockedRows(tournamentAdvanced, allowNotStrictDoubles, preserveIncompleteRows) {
    tournamentAdvanced.doublesLockedPairs = reconcilePairRows(
        tournamentAdvanced.doublesLockedPairs,
        preserveIncompleteRows,
    ).filter((row) => preserveIncompleteRows || toLockedTeamPlayers(row, allowNotStrictDoubles) !== null)
}

function finalizeDoublesRestrictedRows(tournamentAdvanced, allowNotStrictDoubles, preserveIncompleteRows) {
    tournamentAdvanced.doublesRestrictedTeams = reconcilePairRows(
        tournamentAdvanced.doublesRestrictedTeams,
        preserveIncompleteRows,
    ).filter((row) => preserveIncompleteRows || toLockedTeamPlayers(row, allowNotStrictDoubles) !== null)
}

function reconcileAdvancedForMode({
    tournamentAdvanced,
    tournamentTeamSize,
    tournamentFormat,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    if (tournamentTeamSize === 1) {
        tournamentAdvanced.doublesLockedPairs = []
        tournamentAdvanced.doublesRestrictedTeams = []
        tournamentAdvanced.doublesByeTeams = []
        tournamentAdvanced.doublesNextUpTeams = []
        tournamentAdvanced.forcedSitOutPlayer = null
        if (!isBracketFormat(tournamentFormat)) {
            tournamentAdvanced.singlesOpeningMatchups = []
            tournamentAdvanced.singlesByePlayers = []
        }
        return
    }

    tournamentAdvanced.singlesOpeningMatchups = []
    tournamentAdvanced.singlesByePlayers = []
    tournamentAdvanced.singlesNextUpPlayers = []
    if (!allowNotStrictDoubles) {
        const reconcileStrictTeamRows = (teams) =>
            reconcileByeTeams(teams)
                .filter((team) => team.length === 2)
                .map((team) => [...team])

        tournamentAdvanced.doublesLockedPairs = reconcilePairRows(tournamentAdvanced.doublesLockedPairs, true).map(
            ([a, b]) => [a, a && a === b ? "" : b],
        )
        tournamentAdvanced.doublesRestrictedTeams = reconcilePairRows(
            tournamentAdvanced.doublesRestrictedTeams,
            true,
        ).map(([a, b]) => [a, a && a === b ? "" : b])
        tournamentAdvanced.doublesByeTeams = reconcileStrictTeamRows(tournamentAdvanced.doublesByeTeams)
        tournamentAdvanced.doublesNextUpTeams = reconcileStrictTeamRows(tournamentAdvanced.doublesNextUpTeams)
    }
    if (!isBracketFormat(tournamentFormat)) {
        tournamentAdvanced.doublesByeTeams = []
    }
    if (
        !requiresForcedSitOut({
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers,
            minRequiredSitOutPool,
        })
    ) {
        tournamentAdvanced.forcedSitOutPlayer = null
    }
}

function reconcileAdvancedDraftForContext({
    tournamentAdvanced,
    tournamentTeamSize,
    tournamentFormat,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
    courtCount = 1,
    preserveIncompleteRows = true,
}) {
    reconcileAdvancedForMode({
        tournamentAdvanced,
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
    })
    reconcileAdvancedForSelection(tournamentAdvanced, selectedPlayers, allowNotStrictDoubles)
    reconcileAdvancedForEntrants({
        tournamentAdvanced,
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
    })
    reconcileByeSelectionsForContext({
        tournamentAdvanced,
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
    })
    reconcileNextUpSelectionsForContext({
        tournamentAdvanced,
        tournamentTeamSize,
        nextUpSlotCount: getRoundOneQueueTeamSlotCount({
            selectedPlayers,
            tournamentTeamSize,
            tournamentFormat,
            allowNotStrictDoubles,
            minRequiredSitOutPool,
            courtCount,
        }),
        allowNotStrictDoubles,
    })

    if (tournamentTeamSize === 1) {
        finalizeSinglesOpeningRows(tournamentAdvanced, preserveIncompleteRows)
        return
    }
    finalizeDoublesLockedRows(tournamentAdvanced, allowNotStrictDoubles, preserveIncompleteRows)
    finalizeDoublesRestrictedRows(tournamentAdvanced, allowNotStrictDoubles, preserveIncompleteRows)
}

export {
    reconcileAdvancedDraftForContext,
    reconcileAdvancedForEntrants,
    reconcileAdvancedForMode,
    reconcileAdvancedForSelection,
}
