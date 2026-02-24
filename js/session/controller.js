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
    setTournamentSeriesNavCollapsedUi,
    syncAllow2v1Visibility as syncAllow2v1VisibilityUi,
    syncTeamCountControls,
} from "./controller-ui.js"
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
import {
    initNavigation,
    onEndSessionClick,
    onNextRoundClick,
    onNextTournamentClick,
    onPrevRoundClick,
    onPrevTournamentClick,
    onSkipTournamentClick,
} from "./navigation.js"
import { renderPlayerSelection, updateTeamSizeHint } from "./render.js"
import { buildSelectedSession } from "./session-build.js"

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
    tournamentSeriesNav: document.getElementById("tournament-series-nav"),
    tournamentSeriesStatus: document.getElementById("tournament-series-nav-status"),
    prevTournamentBtn: document.getElementById("prev-tournament-btn"),
    nextTournamentBtn: document.getElementById("next-tournament-btn"),
    skipTournamentBtn: document.getElementById("skip-tournament-btn"),
}

const endSessionBtn = document.getElementById("end-session-btn")
const tournamentSeriesNavToggleBtn = document.getElementById("tournament-series-nav-toggle")

let selectedPlayers = new Set()
let teamCount = 2
let gameMode = "free"
let globalState = null
let saveState = null

function syncAllow2v1Visibility(playerCount) {
    syncAllow2v1VisibilityUi({
        playerCount,
        gameMode,
        tournamentMatchMode: getTournamentMatchMode(),
        notStrictDoublesGroup,
        allow2v1Checkbox,
        setNotStrictDoubles,
    })
}

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn

    teamsDecBtn.addEventListener("click", () => {
        if (teamCount > 2) {
            teamCount -= 1
            onSelectionChange()
        }
    })
    teamsIncBtn.addEventListener("click", () => {
        if (teamCount < selectedPlayers.size) {
            teamCount += 1
            onSelectionChange()
        }
    })
    selectAllBtn.addEventListener("click", () => {
        selectedPlayers = new Set(globalState.roster)
        renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
        onSelectionChange()
    })
    deselectAllBtn.addEventListener("click", () => {
        selectedPlayers.clear()
        renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
        onSelectionChange()
    })
    startSessionBtn.addEventListener("click", onStartSessionClick)
    uiState.prevRoundBtn.addEventListener("click", onPrevRoundClick)
    uiState.nextRoundBtn.addEventListener("click", onNextRoundClick)
    uiState.prevTournamentBtn?.addEventListener("click", onPrevTournamentClick)
    uiState.nextTournamentBtn?.addEventListener("click", onNextTournamentClick)
    uiState.skipTournamentBtn?.addEventListener("click", onSkipTournamentClick)
    endSessionBtn.addEventListener("click", onEndSessionClick)
    tournamentSeriesNavToggleBtn?.addEventListener("click", () => {
        const isCollapsed = !uiState.tournamentSeriesNav.classList.contains("is-collapsed")
        setTournamentSeriesNavCollapsedUi(
            {
                tournamentSeriesNav: uiState.tournamentSeriesNav,
                tournamentSeriesNavToggleBtn,
            },
            isCollapsed,
        )
    })
    initCourtConfig(onSelectionChange)
    initTournamentSetup(onSelectionChange)
    initNavigation({
        state,
        saveFn: persistFn,
        confirmFn,
        renderFn: () => renderActiveSession(globalState, saveState, uiState),
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

    // Not-strict doubles is only relevant for tournament doubles with an odd player count.
    syncAllow2v1Visibility(selectedPlayers.size)
    if (mode !== "tournament") {
        allow2v1Checkbox.checked = false
        setNotStrictDoubles(false)
    }
    onSelectionChange()
}

function onStartSessionClick() {
    const players = [...selectedPlayers]
    const session = buildSelectedSession({
        players,
        gameMode,
        teamCount,
        courtCount: getCourtCount(),
        allowNotStrict: getNotStrictDoubles(),
    })

    if (!session) {
        return
    }

    globalState.activeSession = session
    saveState()
    refreshSessionView()
}

function onSelectionChange() {
    const count = selectedPlayers.size
    teamCount = syncTeamCountControls({ teamCount, selectedCount: count, teamCountValue, teamsDecBtn, teamsIncBtn })

    if (gameMode === "tournament") {
        teamSizeHint.textContent = ""
        modeHint.textContent = ""
        const tournamentMatchMode = getTournamentMatchMode()
        syncAllow2v1Visibility(count)
        const minPlayers = getMinPlayersForTournament(getNotStrictDoubles())
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

function refreshSessionView() {
    if (globalState.activeSession) {
        sessionSetup.hidden = true
        sessionActive.hidden = false
        renderActiveSession(globalState, saveState, uiState)
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
    syncAllow2v1Visibility(selectedPlayers.size)
    setTournamentSeriesNavCollapsedUi(
        {
            tournamentSeriesNav: uiState.tournamentSeriesNav,
            tournamentSeriesNavToggleBtn,
        },
        false,
    )

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
    syncAllow2v1Visibility(selectedPlayers.size)

    teamCount = syncTeamCountControls({
        teamCount,
        selectedCount: selectedPlayers.size,
        teamCountValue,
        teamsDecBtn,
        teamsIncBtn,
    })
    onSelectionChange()
}

export { initSession, refreshSessionView }
