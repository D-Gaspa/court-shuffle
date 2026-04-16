import { createAdvancedDialogController } from "./setup/advanced/dialog/controller.js"
import { getAdvancedSetupDom } from "./setup/advanced/dom.js"
import {
    getDefaultAdvancedSettings,
    normalizeAdvancedForConfig,
    reconcileAdvancedDraftForContext,
    validateAdvancedDraft,
} from "./setup/advanced/model/index.js"

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2
const MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS = 3
const MIN_REQUIRED_SIT_OUT_POOL = 3

const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const tournamentFormatGroup = document.getElementById("tournament-format-group")
const tournamentTeamSizeGroup = document.getElementById("tournament-team-size-group")
const tournamentAdvancedActions = document.getElementById("tournament-advanced-actions")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")
const allow2v1Checkbox = document.getElementById("allow-2v1")

const advancedSetupDom = getAdvancedSetupDom(document)
const advancedDialogController = createAdvancedDialogController({
    dom: advancedSetupDom,
    minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
})

function setTournamentAdvancedHistorySource(getHistorySource) {
    advancedDialogController.setHistorySource(getHistorySource)
}

function createDefaultTournamentDraft() {
    return {
        format: "consolation",
        teamSize: 1,
        courtCount: 1,
        allowNotStrictDoubles: false,
        seedOverride: null,
        seedOverrideSignature: "",
        advanced: getDefaultAdvancedSettings(),
        preview: null,
        buildConfig: null,
        previewError: "",
        advancedError: "",
    }
}

function getTournamentMatchMode(teamSize) {
    return teamSize === 1 ? "singles" : "doubles"
}

function getMinPlayersForTournament(teamSize, allowNotStrictDoubles = false) {
    if (teamSize === 2) {
        return allowNotStrictDoubles ? MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS : MIN_DOUBLES_TEAM_PLAYERS
    }
    return MIN_SINGLES_TEAM_PLAYERS
}

function canUseTwoVsOne(selectedPlayers, teamSize) {
    return (
        teamSize === 2 &&
        selectedPlayers.length >= MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS &&
        selectedPlayers.length % 2 === 1
    )
}

function getTournamentHint(format) {
    const formatLabels = {
        consolation: "Everyone keeps playing (winners vs winners, losers vs losers)",
        elimination: "Single elimination knockout bracket",
        "round-robin": "Every team plays every other team",
    }
    return formatLabels[format] || ""
}

function getContinuationTournamentHint(tournamentDraft) {
    return `Continuation keeps ${getTournamentHint(tournamentDraft.format).toLowerCase()} and the previous match type. Court count stays locked${tournamentDraft.teamSize === 2 ? ", but you can still adjust 2v1 availability" : "."}`
}

function getHistorySeedTournamentHint(historySeed, tournamentDraft) {
    const baseHint = getTournamentHint(tournamentDraft.format).toLowerCase()
    if (historySeed?.variant === "same-seed") {
        return `Saved history keeps ${baseHint}, the previous match type, court count, 2v1 setting, advanced settings, and the original seed.`
    }
    return `Saved history keeps ${baseHint}, the previous match type, court count, 2v1 setting, and advanced settings. A fresh seed will be generated when you start.`
}

function syncSelectorSelection(selector, attributeName, selectedValue) {
    for (const button of selector?.querySelectorAll("button") || []) {
        button.classList.toggle("selected", button.dataset[attributeName] === String(selectedValue))
    }
}

function setSelectorDisabledState(selector, disabled) {
    for (const button of selector?.querySelectorAll("button") || []) {
        button.disabled = disabled
    }
}

function reconcileTournamentDraft(tournamentDraft, selectedPlayers) {
    const players = Array.isArray(selectedPlayers) ? [...selectedPlayers] : []
    if (!canUseTwoVsOne(players, tournamentDraft.teamSize)) {
        tournamentDraft.allowNotStrictDoubles = false
    }

    reconcileAdvancedDraftForContext({
        tournamentAdvanced: tournamentDraft.advanced,
        tournamentTeamSize: tournamentDraft.teamSize,
        tournamentFormat: tournamentDraft.format,
        allowNotStrictDoubles: tournamentDraft.allowNotStrictDoubles,
        selectedPlayers: players,
        minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
        courtCount: tournamentDraft.courtCount,
        preserveIncompleteRows: false,
    })
}

function buildTournamentConfig({ tournamentDraft, players }) {
    const selectedPlayers = Array.isArray(players) ? [...players] : []
    return {
        format: tournamentDraft.format,
        teamSize: tournamentDraft.teamSize,
        playerCount: selectedPlayers.length,
        courtHandling: "queue",
        allowNotStrictDoubles: tournamentDraft.allowNotStrictDoubles,
        advanced: normalizeAdvancedForConfig(tournamentDraft.advanced, tournamentDraft.allowNotStrictDoubles),
    }
}

function validateTournamentAdvancedState({ tournamentDraft, selectedPlayers }) {
    return validateAdvancedDraft({
        advancedDraft: tournamentDraft.advanced,
        tournamentFormat: tournamentDraft.format,
        tournamentTeamSize: tournamentDraft.teamSize,
        allowNotStrictDoubles: tournamentDraft.allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
        courtCount: tournamentDraft.courtCount,
    })
}
function renderTournamentSetup({
    tournamentDraft,
    selectedPlayers,
    onChange,
    continuation = null,
    historySeed = null,
}) {
    const players = Array.isArray(selectedPlayers) ? selectedPlayers : []
    const isContinuation = Boolean(continuation)
    const hasHistorySeed = Boolean(historySeed)
    reconcileTournamentDraft(tournamentDraft, players)

    syncSelectorSelection(formatSelector, "format", tournamentDraft.format)
    syncSelectorSelection(teamSizeSelector, "teamSize", tournamentDraft.teamSize)
    setSelectorDisabledState(
        formatSelector,
        Boolean(continuation?.lockedFields?.format) || Boolean(historySeed?.lockedFields?.format),
    )
    setSelectorDisabledState(
        teamSizeSelector,
        Boolean(continuation?.lockedFields?.teamSize) || Boolean(historySeed?.lockedFields?.teamSize),
    )
    tournamentFormatGroup.hidden =
        Boolean(continuation?.lockedFields?.format) || Boolean(historySeed?.lockedFields?.format)
    tournamentTeamSizeGroup.hidden =
        Boolean(continuation?.lockedFields?.teamSize) || Boolean(historySeed?.lockedFields?.teamSize)
    tournamentAdvancedActions.hidden = isContinuation || Boolean(historySeed?.lockedFields?.advanced)
    if (isContinuation) {
        tournamentHint.textContent = getContinuationTournamentHint(tournamentDraft)
    } else if (hasHistorySeed) {
        tournamentHint.textContent = getHistorySeedTournamentHint(historySeed, tournamentDraft)
    } else {
        tournamentHint.textContent = getTournamentHint(tournamentDraft.format)
    }

    const showAllowToggle = tournamentDraft.teamSize === 2
    const canEnableTwoVsOne = canUseTwoVsOne(players, tournamentDraft.teamSize)
    notStrictDoublesGroup.hidden = !showAllowToggle
    allow2v1Checkbox.checked = tournamentDraft.allowNotStrictDoubles
    allow2v1Checkbox.disabled = !canEnableTwoVsOne || Boolean(historySeed?.lockedFields?.allowNotStrictDoubles)
    if (!canEnableTwoVsOne) {
        allow2v1Checkbox.checked = false
    }

    advancedDialogController.render({
        tournamentDraft,
        selectedPlayers: players,
        onChange,
        lockAdvanced: isContinuation || Boolean(historySeed?.lockedFields?.advanced),
    })
}

function initTournamentSetup({ onChange }) {
    for (const button of formatSelector?.querySelectorAll(".format-btn") || []) {
        button.addEventListener("click", () => {
            onChange({ type: "format", value: button.dataset.format })
        })
    }
    for (const button of teamSizeSelector?.querySelectorAll(".team-size-btn") || []) {
        button.addEventListener("click", () => {
            onChange({ type: "team-size", value: Number(button.dataset.teamSize) })
        })
    }
    allow2v1Checkbox?.addEventListener("change", () => {
        onChange({ type: "allow-2v1", value: allow2v1Checkbox.checked })
    })
    advancedDialogController.init()
}

export {
    buildTournamentConfig,
    canUseTwoVsOne,
    createDefaultTournamentDraft,
    getMinPlayersForTournament,
    getTournamentMatchMode,
    initTournamentSetup,
    reconcileTournamentDraft,
    renderTournamentSetup,
    setTournamentAdvancedHistorySource,
    validateTournamentAdvancedState,
}
