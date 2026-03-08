import {
    collectLockedPairKeySet,
    filterByeTeamsToLockedPairs,
    formatCountLabel,
    normalizeByeTeam as normalizeByeTeamValue,
    reconcileByeTeams,
    reconcilePairRows,
    toLockedTeamPlayers,
} from "./advanced-model-helpers.js"
import {
    isBracketFormat as isBracketFormatValue,
    requiresForcedSitOut as requiresForcedSitOutValue,
} from "./advanced-rules.js"
import { validateAdvancedDraft as validateAdvancedDraftValue } from "./advanced-validation.js"

const normalizeByeTeam = normalizeByeTeamValue
const isBracketFormat = isBracketFormatValue
const requiresForcedSitOut = requiresForcedSitOutValue
const validateAdvancedDraft = validateAdvancedDraftValue

function getDefaultAdvancedSettings() {
    return {
        singlesOpeningMatchups: [],
        doublesLockedPairs: [],
        forcedSitOutPlayer: null,
        singlesByePlayers: [],
        doublesByeTeams: [],
    }
}

function cloneAdvancedSettings(value = getDefaultAdvancedSettings()) {
    return {
        singlesOpeningMatchups: (value.singlesOpeningMatchups || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        doublesLockedPairs: (value.doublesLockedPairs || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        forcedSitOutPlayer: value.forcedSitOutPlayer || null,
        singlesByePlayers: [...(value.singlesByePlayers || [])],
        doublesByeTeams: (value.doublesByeTeams || []).map((team) =>
            Array.isArray(team) ? [...team].filter((player) => typeof player === "string") : [],
        ),
    }
}

function reconcileAdvancedForSelection(tournamentAdvanced, selectedPlayers) {
    const selected = new Set(selectedPlayers)

    tournamentAdvanced.singlesOpeningMatchups = reconcilePairRows(tournamentAdvanced.singlesOpeningMatchups, true).map(
        ([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""],
    )

    tournamentAdvanced.doublesLockedPairs = reconcilePairRows(tournamentAdvanced.doublesLockedPairs, true).map(
        ([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""],
    )

    const lockedPairKeySet = collectLockedPairKeySet(tournamentAdvanced.doublesLockedPairs, true)

    tournamentAdvanced.singlesByePlayers = tournamentAdvanced.singlesByePlayers.filter((player) => selected.has(player))

    tournamentAdvanced.doublesByeTeams = reconcileByeTeams(tournamentAdvanced.doublesByeTeams)
        .map((team) => team.filter((player) => selected.has(player)))
        .filter((team) => team.length > 0)
    tournamentAdvanced.doublesByeTeams = filterByeTeamsToLockedPairs(
        tournamentAdvanced.doublesByeTeams,
        lockedPairKeySet,
        true,
    )

    if (tournamentAdvanced.forcedSitOutPlayer && !selected.has(tournamentAdvanced.forcedSitOutPlayer)) {
        tournamentAdvanced.forcedSitOutPlayer = null
    }
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
        tournamentAdvanced.doublesByeTeams = []
        tournamentAdvanced.forcedSitOutPlayer = null
        if (!isBracketFormat(tournamentFormat)) {
            tournamentAdvanced.singlesOpeningMatchups = []
            tournamentAdvanced.singlesByePlayers = []
        }
        return
    }

    tournamentAdvanced.singlesOpeningMatchups = []
    tournamentAdvanced.singlesByePlayers = []
    if (!allowNotStrictDoubles) {
        tournamentAdvanced.doublesLockedPairs = reconcilePairRows(tournamentAdvanced.doublesLockedPairs, true).map(
            ([a, b]) => [a, a && a === b ? "" : b],
        )
        tournamentAdvanced.doublesByeTeams = reconcileByeTeams(tournamentAdvanced.doublesByeTeams)
            .filter((team) => team.length === 2)
            .map((team) => [...team])
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
    }
}

function buildCountLabel(count, singular, plural) {
    if (count <= 0) {
        return "Auto"
    }
    return formatCountLabel(count, singular, plural)
}

function buildSectionStats({ normalized, tournamentTeamSize, bracketFormat, requiredSitOutVisible }) {
    let requiredSitOutLabel = "N/A"
    if (requiredSitOutVisible) {
        requiredSitOutLabel = normalized.forcedSitOutPlayer ? "Locked" : "Auto"
    }
    return {
        requiredSitOut: {
            visible: requiredSitOutVisible,
            activeCount: normalized.forcedSitOutPlayer ? 1 : 0,
            label: requiredSitOutLabel,
        },
        singlesOpening: {
            visible: tournamentTeamSize === 1 && bracketFormat,
            activeCount: normalized.singlesOpeningMatchups.length,
            label: buildCountLabel(normalized.singlesOpeningMatchups.length, "matchup", "matchups"),
        },
        doublesPairs: {
            visible: tournamentTeamSize === 2,
            activeCount: normalized.doublesLockedPairs.filter(([a, b]) => Boolean(a || b)).length,
            label: buildCountLabel(
                normalized.doublesLockedPairs.filter(([a, b]) => Boolean(a || b)).length,
                "team lock",
                "team locks",
            ),
        },
        singlesByes: {
            visible: tournamentTeamSize === 1 && bracketFormat,
            activeCount: normalized.singlesByePlayers.length,
            label: buildCountLabel(normalized.singlesByePlayers.length, "player", "players"),
        },
        doublesByes: {
            visible: tournamentTeamSize === 2 && bracketFormat,
            activeCount: normalized.doublesByeTeams.length,
            label: buildCountLabel(normalized.doublesByeTeams.length, "team", "teams"),
        },
    }
}

function summarizeAdvancedSettings(advancedSettings, context) {
    const { tournamentFormat, tournamentTeamSize, allowNotStrictDoubles, selectedPlayers, minRequiredSitOutPool } =
        context
    const selection = Array.isArray(selectedPlayers) ? selectedPlayers : []
    const draft = cloneAdvancedSettings(advancedSettings || getDefaultAdvancedSettings())

    reconcileAdvancedForMode({
        tournamentAdvanced: draft,
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers: selection,
        minRequiredSitOutPool,
    })
    reconcileAdvancedForSelection(draft, selection)

    const normalized = normalizeAdvancedForConfig(draft, allowNotStrictDoubles)
    const bracketFormat = isBracketFormat(tournamentFormat)
    const requiredSitOutVisible = requiresForcedSitOut({
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers: selection,
        minRequiredSitOutPool,
    })

    const sectionStats = buildSectionStats({ normalized, tournamentTeamSize, bracketFormat, requiredSitOutVisible })

    const totalActive = Object.values(sectionStats).reduce((total, section) => total + section.activeCount, 0)
    return {
        totalActive,
        triggerLabel: totalActive > 0 ? formatCountLabel(totalActive, "override", "overrides") : "Auto",
        sections: sectionStats,
    }
}

export {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    isBracketFormat,
    normalizeAdvancedForConfig,
    normalizeByeTeam,
    summarizeAdvancedSettings,
    reconcileAdvancedForMode,
    reconcileAdvancedForSelection,
    validateAdvancedDraft,
    requiresForcedSitOut,
}
