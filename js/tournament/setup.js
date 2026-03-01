/**
 * Tournament setup UI controller.
 * Manages format/match-type selection and advanced Tournament #1 overrides.
 */

import { hideFieldError, showFieldError } from "../shared/utils.js"
import {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    normalizeAdvancedForConfig,
    reconcileAdvancedForMode,
    reconcileAdvancedForSelection,
    validateAdvancedDraft,
} from "./setup/advanced-model.js"
import { renderAdvancedModalSections } from "./setup/advanced-render.js"

const MIN_DOUBLES_TEAM_PLAYERS = 4
const MIN_SINGLES_TEAM_PLAYERS = 2
const MIN_NOT_STRICT_DOUBLES_TOURNAMENT_PLAYERS = 3
const MIN_REQUIRED_SIT_OUT_POOL = 3

const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const tournamentHint = document.getElementById("tournament-hint")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")

const advancedBtn = document.getElementById("tournament-advanced-btn")
const advancedDialog = document.getElementById("tournament-advanced-dialog")
const advancedCancelBtn = document.getElementById("advanced-cancel")
const advancedApplyBtn = document.getElementById("advanced-apply")
const advancedModalError = document.getElementById("advanced-modal-error")

const requiredSitOutSection = document.getElementById("advanced-required-sitout-section")
const requiredSitOutSelect = document.getElementById("advanced-required-sitout-select")
const singlesOpeningSection = document.getElementById("advanced-singles-opening-section")
const singlesOpeningList = document.getElementById("advanced-singles-opening-list")
const addSinglesMatchupBtn = document.getElementById("advanced-add-singles-matchup")
const doublesPairsSection = document.getElementById("advanced-doubles-pairs-section")
const doublesPairsList = document.getElementById("advanced-doubles-pairs-list")
const addDoublesPairBtn = document.getElementById("advanced-add-doubles-pair")
const singlesByesSection = document.getElementById("advanced-singles-byes-section")
const singlesByesList = document.getElementById("advanced-singles-byes-list")
const doublesByesSection = document.getElementById("advanced-doubles-byes-section")
const doublesByesList = document.getElementById("advanced-doubles-byes-list")
const addDoublesByeTeamBtn = document.getElementById("advanced-add-doubles-bye-team")

let tournamentFormat = "consolation"
let tournamentTeamSize = 1
let selectedPlayers = []
let allowNotStrictDoubles = false
let changeCallback = null
let advancedDraft = null
let tournamentAdvanced = getDefaultAdvancedSettings()

function triggerChange() {
    if (changeCallback) {
        changeCallback()
    }
}

function renderAdvancedSections() {
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
        singlesByesSection,
        singlesByesList,
        doublesByesSection,
        doublesByesList,
        onRequestRender: renderAdvancedSections,
    })
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
}

function openAdvancedDialog() {
    advancedDraft = cloneAdvancedSettings(tournamentAdvanced)
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
        return
    }

    hideFieldError(advancedModalError)
    tournamentAdvanced = normalizeAdvancedForConfig(advancedDraft)
    advancedDialog.close()
    triggerChange()
}

function bindFormatButtons(onChange) {
    for (const btn of formatSelector.querySelectorAll(".format-btn")) {
        btn.addEventListener("click", () => {
            tournamentFormat = btn.dataset.format
            for (const option of formatSelector.querySelectorAll(".format-btn")) {
                option.classList.toggle("selected", option === btn)
            }
            updateTournamentHint()
            onChange()
        })
    }
}

function bindTeamSizeButtons(onChange) {
    for (const btn of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        btn.addEventListener("click", () => {
            tournamentTeamSize = Number(btn.dataset.teamSize)
            for (const option of teamSizeSelector.querySelectorAll(".team-size-btn")) {
                option.classList.toggle("selected", option === btn)
            }
            notStrictDoublesGroup.hidden = tournamentTeamSize !== 2
            updateTournamentHint()
            onChange()
        })
    }
}

function bindAdvancedButtons() {
    advancedBtn?.addEventListener("click", openAdvancedDialog)
    advancedCancelBtn?.addEventListener("click", () => advancedDialog?.close())
    advancedApplyBtn?.addEventListener("click", onAdvancedApply)

    requiredSitOutSelect?.addEventListener("change", () => {
        if (advancedDraft) {
            advancedDraft.forcedSitOutPlayer = requiredSitOutSelect.value || null
        }
    })

    addSinglesMatchupBtn?.addEventListener("click", () => {
        advancedDraft.singlesOpeningMatchups.push(["", ""])
        renderAdvancedSections()
    })
    addDoublesPairBtn?.addEventListener("click", () => {
        advancedDraft.doublesLockedPairs.push(["", ""])
        renderAdvancedSections()
    })
    addDoublesByeTeamBtn?.addEventListener("click", () => {
        advancedDraft.doublesByeTeams.push(["", ""])
        renderAdvancedSections()
    })
}

function initTournamentSetup(onChange) {
    changeCallback = onChange
    bindFormatButtons(onChange)
    bindTeamSizeButtons(onChange)
    bindAdvancedButtons()
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
        advanced: normalizeAdvancedForConfig(tournamentAdvanced),
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
