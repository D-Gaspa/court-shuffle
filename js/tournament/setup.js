/**
 * Tournament setup UI controller.
 * Manages format/match-type selection and advanced Tournament #1 overrides.
 */

import { hideFieldError, showFieldError } from "../shared/utils.js"
import { bindAdvancedActionButtons } from "./setup/advanced-bindings.js"
import { getAdvancedSetupDom } from "./setup/advanced-dom.js"
import { createAdvancedModalUiController } from "./setup/advanced-modal-ui.js"
import {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    normalizeAdvancedForConfig,
    reconcileAdvancedForMode,
    reconcileAdvancedForSelection,
    summarizeAdvancedSettings,
    validateAdvancedDraft,
} from "./setup/advanced-model.js"
import { renderAdvancedModalSections } from "./setup/advanced-render.js"
import { bindTournamentFormatButtons, bindTournamentTeamSizeButtons } from "./setup/mode-bindings.js"

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2
const MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS = 3
const MIN_REQUIRED_SIT_OUT_POOL = 3

const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")

const {
    addDoublesPairBtn,
    addSinglesMatchupBtn,
    advancedApplyBtn,
    advancedBtn,
    advancedCancelBtn,
    advancedCardElements,
    advancedDialog,
    advancedModalError,
    advancedValidationSummary,
    doublesByesList,
    doublesByesSection,
    doublesPairsList,
    doublesPairsSection,
    requiredSitOutSection,
    requiredSitOutSelect,
    singlesByesList,
    singlesByesSection,
    singlesOpeningList,
    singlesOpeningSection,
    tournamentAdvancedState,
} = getAdvancedSetupDom(document)

let tournamentFormat = "consolation"
let tournamentTeamSize = 1
let selectedPlayers = []
let allowNotStrictDoubles = false
let changeCallback = null
let advancedDraft = null
let tournamentAdvanced = getDefaultAdvancedSettings()

function getAdvancedSummaryContext() {
    return {
        tournamentFormat,
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
    }
}

function getAdvancedSummary(source) {
    return summarizeAdvancedSettings(source, getAdvancedSummaryContext())
}

const advancedUi = createAdvancedModalUiController({
    advancedDialog,
    advancedModalError,
    advancedValidationSummary,
    tournamentAdvancedState,
    cardElements: advancedCardElements,
    getCommittedSummary: () => getAdvancedSummary(tournamentAdvanced),
    getActiveSummary: () => getAdvancedSummary(advancedDraft || tournamentAdvanced),
})

function renderAdvancedSections() {
    if (!advancedDraft) {
        advancedUi.renderMeta()
        return
    }

    renderAdvancedModalSections({
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
        advancedDraft,
        requiredSitOutSection,
        requiredSitOutSelect,
        singlesOpeningSection,
        singlesOpeningList,
        doublesPairsSection,
        doublesPairsList,
        addDoublesPairBtn,
        singlesByesSection,
        singlesByesList,
        doublesByesSection,
        doublesByesList,
        onRequestRender: renderAdvancedSections,
    })
    advancedUi.syncCardLayout()
    advancedUi.renderMeta()
}

function reconcileAdvancedState() {
    reconcileAdvancedForMode({
        tournamentAdvanced,
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
    })
    reconcileAdvancedForSelection(tournamentAdvanced, selectedPlayers)
    advancedUi.renderMeta()
}

function openAdvancedDialog() {
    advancedDraft = cloneAdvancedSettings(tournamentAdvanced)
    advancedUi.resetCardExpansion(tournamentTeamSize)
    hideFieldError(advancedModalError)
    renderAdvancedSections()
    advancedDialog.showModal()
}

function onAdvancedApply() {
    const error = validateAdvancedDraft({
        advancedDraft,
        tournamentFormat,
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool: MIN_REQUIRED_SIT_OUT_POOL,
    })
    if (error) {
        showFieldError(advancedModalError, error)
        advancedUi.renderMeta()
        return
    }

    hideFieldError(advancedModalError)
    tournamentAdvanced = normalizeAdvancedForConfig(advancedDraft, allowNotStrictDoubles)
    advancedDialog.close()
    changeCallback?.()
    advancedUi.renderMeta()
}

function bindAdvancedButtons() {
    bindAdvancedActionButtons({
        advancedBtn,
        advancedCancelBtn,
        advancedApplyBtn,
        advancedDialog,
        requiredSitOutSelect,
        addSinglesMatchupBtn,
        addDoublesPairBtn,
        onOpenDialog: openAdvancedDialog,
        onApplyDialog: onAdvancedApply,
        onCloseDialog: () => {
            advancedDraft = null
            hideFieldError(advancedModalError)
            advancedUi.renderMeta()
        },
        onRequiredSitOutChange: (nextValue) => {
            if (!advancedDraft) {
                return
            }
            advancedDraft.forcedSitOutPlayer = nextValue || null
            advancedUi.renderMeta()
        },
        onAddSinglesMatchup: () => {
            if (!advancedDraft) {
                return
            }
            advancedDraft.singlesOpeningMatchups.push(["", ""])
            renderAdvancedSections()
        },
        onAddDoublesPair: () => {
            if (!advancedDraft) {
                return
            }
            advancedDraft.doublesLockedPairs.push(["", ""])
            renderAdvancedSections()
        },
    })

    advancedUi.bindInteractions()
}

function initTournamentSetup(onChange) {
    changeCallback = onChange
    bindTournamentFormatButtons(formatSelector, (nextFormat) => {
        tournamentFormat = nextFormat
        updateTournamentHint()
        onChange()
    })
    bindTournamentTeamSizeButtons(teamSizeSelector, (nextSize) => {
        tournamentTeamSize = nextSize
        notStrictDoublesGroup.hidden = tournamentTeamSize !== 2
        updateTournamentHint()
        onChange()
    })
    bindAdvancedButtons()
    advancedUi.renderMeta()
}

function showTournamentConfig() {
    tournamentConfig.hidden = false
}

function hideTournamentConfig() {
    tournamentConfig.hidden = true
}

function updateTournamentHint() {
    const formatLabels = {
        consolation: "Everyone keeps playing (winners vs winners, losers vs losers)",
        elimination: "Single elimination knockout bracket",
        "round-robin": "Every team plays every other team",
    }
    tournamentHint.textContent = formatLabels[tournamentFormat] || ""
}

function updateTournamentPlayers(players) {
    selectedPlayers = Array.isArray(players) ? [...players] : []
    reconcileAdvancedForSelection(tournamentAdvanced, selectedPlayers)
    advancedUi.renderMeta()
}

function getTournamentConfig(players, allowNotStrict) {
    selectedPlayers = [...players]
    allowNotStrictDoubles = Boolean(allowNotStrict && tournamentTeamSize === 2)
    reconcileAdvancedState()
    return {
        format: tournamentFormat,
        teamSize: tournamentTeamSize,
        playerCount: players.length,
        courtHandling: "queue",
        allowNotStrictDoubles,
        advanced: normalizeAdvancedForConfig(tournamentAdvanced, allowNotStrictDoubles),
    }
}

function getMinPlayersForTournament(allowNotStrict = false) {
    if (tournamentTeamSize === 2) {
        return allowNotStrict ? MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS : MIN_DOUBLES_TEAM_PLAYERS
    }
    return MIN_SINGLES_TEAM_PLAYERS
}

function getTournamentMatchMode() {
    return tournamentTeamSize === 1 ? "singles" : "doubles"
}

function resetTournamentSetup() {
    tournamentFormat = "consolation"
    tournamentTeamSize = 1
    tournamentAdvanced = getDefaultAdvancedSettings()
    advancedDraft = null

    for (const button of formatSelector.querySelectorAll(".format-btn")) {
        button.classList.toggle("selected", button.dataset.format === "consolation")
    }
    for (const button of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        button.classList.toggle("selected", button.dataset.teamSize === "1")
    }

    notStrictDoublesGroup.hidden = true
    tournamentHint.textContent = ""
    hideFieldError(advancedModalError)
    advancedUi.renderMeta()
}

export {
    getMinPlayersForTournament,
    getTournamentConfig,
    getTournamentMatchMode,
    hideTournamentConfig,
    initTournamentSetup,
    resetTournamentSetup,
    showTournamentConfig,
    updateTournamentHint,
    updateTournamentPlayers,
}
