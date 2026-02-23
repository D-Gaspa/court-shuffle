import { ID_RADIX, ID_SLICE_END, ID_SLICE_START } from "../constants.js"
import { generateOptimalRoundSequence, generateStructuredRounds, wrapFreeRounds } from "../shuffle.js"
import { endSession, renderActiveSession } from "./active.js"
import {
    clampCourtCount,
    getCourtCount,
    initCourtConfig,
    resetCourtCount,
    setCourtVisibility,
    updateCourtHint,
} from "./court-config.js"
import { initModifyPlayers, openModifyDialog } from "./modify-players.js"
import { renderPlayerSelection, updateTeamSizeHint } from "./render.js"

const sessionSetup = document.getElementById("session-setup")
const sessionActive = document.getElementById("session-active")
const noRosterWarning = document.getElementById("no-roster-warning")
const sessionConfig = document.getElementById("session-config")
const playerSelection = document.getElementById("player-selection")
const selectAllBtn = document.getElementById("select-all-btn")
const deselectAllBtn = document.getElementById("deselect-all-btn")
const modeSelector = document.getElementById("mode-selector")
const modeHint = document.getElementById("mode-hint")
const teamsConfig = document.getElementById("teams-config")
const teamsDecBtn = document.getElementById("teams-dec")
const teamsIncBtn = document.getElementById("teams-inc")
const teamCountValue = document.getElementById("team-count-value")
const teamSizeHint = document.getElementById("team-size-hint")
const startSessionBtn = document.getElementById("start-session-btn")
const modifyPlayersBtn = document.getElementById("modify-players-btn")

const uiState = {
    roundNumber: document.getElementById("round-number"),
    roundTotal: document.getElementById("round-total"),
    roundInfo: document.getElementById("round-info"),
    prevRoundBtn: document.getElementById("prev-round-btn"),
    nextRoundBtn: document.getElementById("next-round-btn"),
    bracketContainer: document.getElementById("bracket-container"),
    sitOutContainer: document.getElementById("sit-out-container"),
    sitOutList: document.getElementById("sit-out-list"),
    noMoreRounds: document.getElementById("no-more-rounds"),
}

const endSessionBtn = document.getElementById("end-session-btn")

let selectedPlayers = new Set()
let teamCount = 2
let gameMode = "free"
let globalState = null
let saveState = null
let askConfirm = null

function renderActiveSessionState() {
    renderActiveSession(globalState, saveState, uiState)
}

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn
    askConfirm = confirmFn

    teamsDecBtn.addEventListener("click", onTeamsDecClick)
    teamsIncBtn.addEventListener("click", onTeamsIncClick)
    selectAllBtn.addEventListener("click", onSelectAllClick)
    deselectAllBtn.addEventListener("click", onDeselectAllClick)
    startSessionBtn.addEventListener("click", onStartSessionClick)
    uiState.prevRoundBtn.addEventListener("click", onPrevRoundClick)
    uiState.nextRoundBtn.addEventListener("click", onNextRoundClick)
    endSessionBtn.addEventListener("click", onEndSessionClick)
    modifyPlayersBtn.addEventListener("click", openModifyDialog)

    initModifyPlayers(state, persistFn, renderActiveSessionState)
    initCourtConfig(onSelectionChange)

    for (const btn of modeSelector.querySelectorAll(".mode-btn")) {
        btn.addEventListener("click", () => onModeChange(btn.dataset.mode))
    }
}

function onModeChange(mode) {
    gameMode = mode
    for (const btn of modeSelector.querySelectorAll(".mode-btn")) {
        btn.classList.toggle("selected", btn.dataset.mode === mode)
    }

    if (mode === "free") {
        teamsConfig.hidden = false
        modeHint.textContent = ""
    } else {
        teamsConfig.hidden = true
        teamCount = 2
        resetCourtCount()
    }
    setCourtVisibility(mode)
    onSelectionChange()
}

function onTeamsDecClick() {
    if (teamCount > 2) {
        teamCount -= 1
        onSelectionChange()
    }
}

function onTeamsIncClick() {
    if (teamCount < selectedPlayers.size) {
        teamCount += 1
        onSelectionChange()
    }
}

function onSelectAllClick() {
    selectedPlayers = new Set(globalState.roster)
    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
    onSelectionChange()
}

function onDeselectAllClick() {
    selectedPlayers.clear()
    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
    onSelectionChange()
}

function onStartSessionClick() {
    const players = [...selectedPlayers]
    if (players.length < 2) {
        return
    }

    let rounds
    if (gameMode === "free") {
        const raw = generateOptimalRoundSequence(players, teamCount)
        if (raw.length === 0) {
            return
        }
        rounds = wrapFreeRounds(raw)
    } else {
        rounds = generateStructuredRounds(players, gameMode, getCourtCount())
        if (rounds.length === 0) {
            return
        }
    }

    globalState.activeSession = {
        id: Date.now().toString(ID_RADIX) + Math.random().toString(ID_RADIX).slice(ID_SLICE_START, ID_SLICE_END),
        date: new Date().toISOString(),
        players,
        teamCount: gameMode === "free" ? teamCount : 2,
        mode: gameMode,
        courtCount: gameMode === "free" ? 1 : getCourtCount(),
        rounds,
        currentRound: 0,
    }

    saveState()
    refreshSessionView()
}

function onPrevRoundClick() {
    const session = globalState.activeSession
    if (!session || session.currentRound <= 0) {
        return
    }
    session.currentRound -= 1
    saveState()
    renderActiveSessionState()
}

function onNextRoundClick() {
    const session = globalState.activeSession
    if (!session || session.currentRound >= session.rounds.length - 1) {
        return
    }
    session.currentRound += 1
    saveState()
    renderActiveSessionState()
}

function onEndSessionClick() {
    const opts = {
        okLabel: "Save & End",
        okClass: "btn-primary",
        extraLabel: "Discard",
        onExtra: () => {
            endSession(globalState, saveState, false)
            refreshSessionView()
        },
    }
    askConfirm(
        "End Session",
        "Save this session to history, or discard it?",
        () => {
            endSession(globalState, saveState, true)
            refreshSessionView()
        },
        opts,
    )
}

function onSelectionChange() {
    const count = selectedPlayers.size
    clampTeamCount()
    clampCourtCount(count, gameMode)
    teamCountValue.textContent = teamCount

    if (gameMode === "free") {
        updateTeamSizeHint(count, teamCount, teamSizeHint)
        modeHint.textContent = ""
    } else {
        teamSizeHint.textContent = ""
        const label = gameMode === "singles" ? "1v1" : "2v2"
        modeHint.textContent = count >= 2 ? `${label} matches` : ""
    }
    updateCourtHint(count, gameMode)
    startSessionBtn.disabled = count < 2
}

function clampTeamCount() {
    const max = Math.max(2, selectedPlayers.size)
    if (teamCount > max) {
        teamCount = max
    }
    if (teamCount < 2) {
        teamCount = 2
    }

    teamCountValue.textContent = teamCount
    teamsDecBtn.disabled = teamCount <= 2
    teamsIncBtn.disabled = teamCount >= selectedPlayers.size || selectedPlayers.size < 2
}

function refreshSessionView() {
    if (globalState.activeSession) {
        sessionSetup.hidden = true
        sessionActive.hidden = false
        renderActiveSessionState()
        return
    }

    sessionSetup.hidden = false
    sessionActive.hidden = true

    if (globalState.roster.length < 2) {
        noRosterWarning.hidden = false
        sessionConfig.hidden = true
        return
    }

    noRosterWarning.hidden = true
    sessionConfig.hidden = false

    const validSelected = new Set()
    for (const p of selectedPlayers) {
        if (globalState.roster.includes(p)) {
            validSelected.add(p)
        }
    }
    selectedPlayers = validSelected

    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)

    for (const btn of modeSelector.querySelectorAll(".mode-btn")) {
        btn.classList.toggle("selected", btn.dataset.mode === gameMode)
    }
    teamsConfig.hidden = gameMode !== "free"
    setCourtVisibility(gameMode)

    clampTeamCount()
    onSelectionChange()
}

export { initSession, refreshSessionView }
