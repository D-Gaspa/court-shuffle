import {
    getMinPlayersForTournament,
    getTournamentMatchMode,
    hideTournamentConfig,
    initTournamentSetup,
    resetTournamentSetup,
    showTournamentConfig,
    updateTournamentHint,
    updateTournamentPlayers,
} from "../tournament/setup.js"
import { renderActiveSession } from "./active.js"
import {
    clampCourtCount,
    getCourtCount,
    getNotStrictDoubles,
    initCourtConfig,
    resetCourtCount,
    setCourtVisibility,
    setNotStrictDoubles,
    updateCourtHint,
} from "./court-config.js"
import { initNavigation, onEndSessionClick, onNextRoundClick, onPrevRoundClick } from "./navigation.js"
import { renderPlayerSelection, updateTeamSizeHint } from "./render.js"
import { buildFreeSession, buildTournamentSession } from "./session-start.js"

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
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")
const allow2v1Checkbox = document.getElementById("allow-2v1")

const uiState = {
    roundPrefix: document.getElementById("round-prefix"),
    roundNumber: document.getElementById("round-number"),
    roundTotal: document.getElementById("round-total"),
    roundInfo: document.getElementById("round-info"),
    prevRoundBtn: document.getElementById("prev-round-btn"),
    nextRoundBtn: document.getElementById("next-round-btn"),
    nextRoundLabel: document.getElementById("next-round-label"),
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

function renderActiveSessionState() {
    renderActiveSession(globalState, saveState, uiState)
}

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn

    teamsDecBtn.addEventListener("click", onTeamsDecClick)
    teamsIncBtn.addEventListener("click", onTeamsIncClick)
    selectAllBtn.addEventListener("click", onSelectAllClick)
    deselectAllBtn.addEventListener("click", onDeselectAllClick)
    startSessionBtn.addEventListener("click", onStartSessionClick)
    uiState.prevRoundBtn.addEventListener("click", onPrevRoundClick)
    uiState.nextRoundBtn.addEventListener("click", onNextRoundClick)
    endSessionBtn.addEventListener("click", onEndSessionClick)
    initCourtConfig(onSelectionChange)
    initTournamentSetup(onSelectionChange)
    initNavigation({
        state,
        saveFn: persistFn,
        confirmFn,
        renderFn: renderActiveSessionState,
        refreshFn: refreshSessionView,
    })

    allow2v1Checkbox.addEventListener("change", () => {
        setNotStrictDoubles(allow2v1Checkbox.checked)
        onSelectionChange()
    })

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
    }

    // Tournament config visibility
    if (mode === "tournament") {
        showTournamentConfig()
        updateTournamentHint()
        setCourtVisibility(getTournamentMatchMode())
    } else {
        hideTournamentConfig()
        resetTournamentSetup()
        setCourtVisibility(mode)
        resetCourtCount()
    }

    // Not-strict doubles: only exposed through tournament match type selector now.
    notStrictDoublesGroup.hidden = !(mode === "tournament" && getTournamentMatchMode() === "doubles")
    if (mode !== "tournament") {
        allow2v1Checkbox.checked = false
        setNotStrictDoubles(false)
    }
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

    let session
    if (gameMode === "tournament") {
        session = buildTournamentSession({
            players,
            allowNotStrict: getNotStrictDoubles(),
            courtCount: getCourtCount(),
        })
    } else {
        session = buildFreeSession({
            players,
            teamCount,
            gameMode,
            courtCount: getCourtCount(),
            allowNotStrict: getNotStrictDoubles(),
        })
    }

    if (!session) {
        return
    }

    globalState.activeSession = session
    saveState()
    refreshSessionView()
}

function onSelectionChange() {
    const count = selectedPlayers.size
    clampTeamCount()
    teamCountValue.textContent = teamCount

    if (gameMode === "tournament") {
        teamSizeHint.textContent = ""
        modeHint.textContent = ""
        const minPlayers = getMinPlayersForTournament(getNotStrictDoubles())
        const tournamentMatchMode = getTournamentMatchMode()
        setCourtVisibility(tournamentMatchMode)
        startSessionBtn.disabled = count < minPlayers
        updateTournamentPlayers([...selectedPlayers])
        clampCourtCount(count, tournamentMatchMode)
        updateCourtHint(count, tournamentMatchMode)
    } else if (gameMode === "free") {
        updateTeamSizeHint(count, teamCount, teamSizeHint)
        modeHint.textContent = ""
        clampCourtCount(count, gameMode)
        updateCourtHint(count, gameMode)
        startSessionBtn.disabled = count < 2
    }
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
    if (gameMode === "tournament") {
        showTournamentConfig()
        setCourtVisibility(getTournamentMatchMode())
    } else {
        hideTournamentConfig()
        setCourtVisibility(gameMode)
    }
    notStrictDoublesGroup.hidden = !(gameMode === "tournament" && getTournamentMatchMode() === "doubles")

    clampTeamCount()
    onSelectionChange()
}

export { initSession, refreshSessionView }
