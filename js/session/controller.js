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
import { renderActiveSession } from "./active/active.js"
import { resetGoTopButtonVisibility, syncGoTopButtonVisibility } from "./active/go-top-button.js"
import {
    initNavigation,
    onEndSessionClick,
    onNextRoundClick,
    onNextTournamentClick,
    onPrevRoundClick,
    onPrevTournamentClick,
    onSkipTournamentClick,
} from "./active/navigation.js"
import { renderPlayerSelection, updateTeamSizeHint } from "./active/render.js"
import {
    allow2v1Checkbox,
    deselectAllBtn,
    endSessionBtn,
    modeHint,
    modeSelector,
    noRosterWarning,
    notStrictDoublesGroup,
    playerSelection,
    selectAllBtn,
    sessionActive,
    sessionConfig,
    sessionSetup,
    startSessionBtn,
    teamCountValue,
    teamSizeHint,
    teamsConfig,
    teamsDecBtn,
    teamsIncBtn,
    tournamentSeriesNavToggleBtn,
    uiState,
} from "./controller/elements.js"
import {
    setTournamentSeriesNavCollapsedUi,
    syncAllow2v1Visibility as syncAllow2v1VisibilityUi,
    syncTeamCountControls,
} from "./controller/ui.js"
import {
    bindModeButtons,
    reconcileSelectedPlayersWithRoster,
    renderActiveSessionView,
    showSetupSessionView,
    syncInitialGoTopButtonState,
    syncModeSelectorSelection,
} from "./controller/view-helpers.js"
import { buildSelectedSession } from "./setup/build.js"
import {
    clampCourtCount,
    clearCourtHint,
    getCourtCount,
    getNotStrictDoubles,
    initCourtConfig,
    resetCourtCount,
    setCourtVisibility,
    setNotStrictDoubles,
    updateCourtHint,
} from "./setup/courts.js"

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

function bindSelectionButtons() {
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
    selectAllBtn.addEventListener("click", onSelectAllClick)
    deselectAllBtn.addEventListener("click", onDeselectAllClick)
}

function bindActiveSessionNavButtons() {
    uiState.prevRoundBtn.addEventListener("click", onPrevRoundClick)
    uiState.nextRoundBtn.addEventListener("click", onNextRoundClick)
    uiState.goTopBtn?.addEventListener("click", () => globalThis.scrollTo({ top: 0, behavior: "smooth" }))
    uiState.prevTournamentBtn?.addEventListener("click", onPrevTournamentClick)
    uiState.nextTournamentBtn?.addEventListener("click", onNextTournamentClick)
    uiState.skipTournamentBtn?.addEventListener("click", onSkipTournamentClick)
    endSessionBtn.addEventListener("click", onEndSessionClick)
}

function bindTournamentSeriesToggle() {
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
}

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn

    bindSelectionButtons()
    startSessionBtn.addEventListener("click", onStartSessionClick)
    bindActiveSessionNavButtons()
    bindTournamentSeriesToggle()
    initCourtConfig(onSelectionChange)
    initTournamentSetup(onSelectionChange)
    initNavigation({
        state,
        saveFn: persistFn,
        confirmFn,
        renderFn: () => renderActiveSession(globalState, saveState, uiState),
        refreshFn: refreshSessionView,
    })
    syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility)
    allow2v1Checkbox.addEventListener("change", () => {
        setNotStrictDoubles(allow2v1Checkbox.checked)
        onSelectionChange()
    })
    bindModeButtons(modeSelector, onModeChange)
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
        clearCourtHint()
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
        renderActiveSessionView({
            sessionSetup,
            sessionActive,
            globalState,
            saveState,
            uiState,
            renderActiveSession,
            syncGoTopButtonVisibility,
        })
        return
    }

    showSetupSessionView({ sessionSetup, sessionActive, uiState, resetGoTopButtonVisibility })

    if (globalState.roster.length < 2) {
        noRosterWarning.hidden = false
        sessionConfig.hidden = true
        return
    }
    noRosterWarning.hidden = true
    sessionConfig.hidden = false

    selectedPlayers = reconcileSelectedPlayersWithRoster(selectedPlayers, globalState.roster)
    syncAllow2v1Visibility(selectedPlayers.size)
    setTournamentSeriesNavCollapsedUi(
        {
            tournamentSeriesNav: uiState.tournamentSeriesNav,
            tournamentSeriesNavToggleBtn,
        },
        false,
    )

    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)

    syncModeSelectorSelection(modeSelector, gameMode)
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
