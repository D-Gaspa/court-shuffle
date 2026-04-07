import { getRoundOneQueueTeamSlotCount } from "../context.js"
import { validateAdvancedDraft as validateAdvancedDraftValue } from "../validation/index.js"
import { formatCountLabel, getBracketByeSlotCount, normalizeByeTeam as normalizeByeTeamValue } from "./helpers.js"
import { normalizeAdvancedForConfig as normalizeAdvancedForConfigValue } from "./normalize.js"
import { reconcileByeSelectionsForContext, reconcileNextUpSelectionsForContext } from "./override-reconcile.js"
import {
    reconcileAdvancedDraftForContext as reconcileAdvancedDraftForContextValue,
    reconcileAdvancedForEntrants,
    reconcileAdvancedForMode as reconcileAdvancedForModeValue,
    reconcileAdvancedForSelection as reconcileAdvancedForSelectionValue,
} from "./reconcile.js"
import { isBracketFormat as isBracketFormatValue, requiresForcedSitOut as requiresForcedSitOutValue } from "./rules.js"
import { buildSectionStats } from "./summary.js"

const normalizeByeTeam = normalizeByeTeamValue
const normalizeAdvancedForConfig = normalizeAdvancedForConfigValue
const isBracketFormat = isBracketFormatValue
const reconcileAdvancedDraftForContext = reconcileAdvancedDraftForContextValue
const reconcileAdvancedForMode = reconcileAdvancedForModeValue
const reconcileAdvancedForSelection = reconcileAdvancedForSelectionValue
const requiresForcedSitOut = requiresForcedSitOutValue
const validateAdvancedDraft = validateAdvancedDraftValue

function getDefaultAdvancedSettings() {
    return {
        singlesOpeningMatchups: [],
        doublesLockedPairs: [],
        doublesRestrictedTeams: [],
        forcedSitOutPlayer: null,
        singlesByePlayers: [],
        doublesByeTeams: [],
        singlesNextUpPlayers: [],
        doublesNextUpTeams: [],
    }
}

function cloneAdvancedSettings(value = getDefaultAdvancedSettings()) {
    return {
        singlesOpeningMatchups: (value.singlesOpeningMatchups || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        doublesLockedPairs: (value.doublesLockedPairs || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        doublesRestrictedTeams: (value.doublesRestrictedTeams || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        forcedSitOutPlayer: value.forcedSitOutPlayer || null,
        singlesByePlayers: [...(value.singlesByePlayers || [])],
        doublesByeTeams: (value.doublesByeTeams || []).map((team) =>
            Array.isArray(team) ? [...team].filter((player) => typeof player === "string") : [],
        ),
        singlesNextUpPlayers: [...(value.singlesNextUpPlayers || [])],
        doublesNextUpTeams: (value.doublesNextUpTeams || []).map((team) =>
            Array.isArray(team) ? [...team].filter((player) => typeof player === "string") : [],
        ),
    }
}

function prepareAdvancedSummaryDraft(advancedSettings, context) {
    const draft = cloneAdvancedSettings(advancedSettings || getDefaultAdvancedSettings())
    reconcileAdvancedForMode({
        tournamentAdvanced: draft,
        tournamentTeamSize: context.tournamentTeamSize,
        tournamentFormat: context.tournamentFormat,
        allowNotStrictDoubles: context.allowNotStrictDoubles,
        selectedPlayers: context.selection,
        minRequiredSitOutPool: context.minRequiredSitOutPool,
    })
    reconcileAdvancedForSelection(draft, context.selection, context.allowNotStrictDoubles)
    reconcileAdvancedForEntrants({
        tournamentAdvanced: draft,
        tournamentTeamSize: context.tournamentTeamSize,
        allowNotStrictDoubles: context.allowNotStrictDoubles,
        selectedPlayers: context.selection,
        minRequiredSitOutPool: context.minRequiredSitOutPool,
    })
    reconcileByeSelectionsForContext({
        tournamentAdvanced: draft,
        tournamentTeamSize: context.tournamentTeamSize,
        tournamentFormat: context.tournamentFormat,
        allowNotStrictDoubles: context.allowNotStrictDoubles,
        selectedPlayers: context.selection,
        minRequiredSitOutPool: context.minRequiredSitOutPool,
    })
    reconcileNextUpSelectionsForContext({
        tournamentAdvanced: draft,
        tournamentTeamSize: context.tournamentTeamSize,
        nextUpSlotCount: context.nextUpSlotCount,
        allowNotStrictDoubles: context.allowNotStrictDoubles,
    })
    return draft
}

function buildAdvancedSummaryContext(context) {
    const selection = Array.isArray(context.selectedPlayers) ? context.selectedPlayers : []
    return {
        ...context,
        selection,
        bracketFormat: isBracketFormat(context.tournamentFormat),
        byeSlotCount: getBracketByeSlotCount({
            selectedPlayers: selection,
            tournamentTeamSize: context.tournamentTeamSize,
            allowNotStrictDoubles: context.allowNotStrictDoubles,
            minRequiredSitOutPool: context.minRequiredSitOutPool,
        }),
        nextUpSlotCount: getRoundOneQueueTeamSlotCount({
            selectedPlayers: selection,
            tournamentTeamSize: context.tournamentTeamSize,
            tournamentFormat: context.tournamentFormat,
            allowNotStrictDoubles: context.allowNotStrictDoubles,
            minRequiredSitOutPool: context.minRequiredSitOutPool,
            courtCount: context.courtCount,
        }),
        requiredSitOutVisible: requiresForcedSitOut({
            tournamentTeamSize: context.tournamentTeamSize,
            allowNotStrictDoubles: context.allowNotStrictDoubles,
            selectedPlayers: selection,
            minRequiredSitOutPool: context.minRequiredSitOutPool,
        }),
    }
}

function summarizeAdvancedSettings(advancedSettings, context) {
    const summaryContext = buildAdvancedSummaryContext(context)
    const draft = prepareAdvancedSummaryDraft(advancedSettings, summaryContext)
    const normalized = normalizeAdvancedForConfig(draft, summaryContext.allowNotStrictDoubles)
    const sectionStats = buildSectionStats({
        normalized,
        tournamentTeamSize: summaryContext.tournamentTeamSize,
        bracketFormat: summaryContext.bracketFormat,
        requiredSitOutVisible: summaryContext.requiredSitOutVisible,
        byeSlotCount: summaryContext.byeSlotCount,
        nextUpSlotCount: summaryContext.nextUpSlotCount,
    })

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
    reconcileAdvancedDraftForContext,
    reconcileAdvancedForMode,
    reconcileAdvancedForSelection,
    validateAdvancedDraft,
    requiresForcedSitOut,
}
