import { buildTournamentPreview } from "../tournament/series/build.js"
import {
    getMinPlayersForTournament,
    getTournamentConfig,
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
import { bindActiveSessionNavButtons, bindTournamentSeriesToggle } from "./controller/bindings.js"
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
    tournamentAdvancedError,
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentSeriesNavToggleBtn,
    uiState,
} from "./controller/elements.js"
import { handleModeChange } from "./controller/mode-change.js"
import { refreshSessionViewState } from "./controller/refresh-view.js"
import { bindSelectionButtons } from "./controller/selection-buttons.js"
import { createStartSessionHandler } from "./controller/start-session.js"
import { clearTournamentDistribution, updateTournamentPreview } from "./controller/tournament-preview.js"
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
let tournamentPreview = null
let tournamentBuildConfig = null

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

function bindStartSessionButton() {
    startSessionBtn.addEventListener(
        "click",
        createStartSessionHandler({
            getSelectedPlayers: () => selectedPlayers,
            getGameMode: () => gameMode,
            getTournamentPreview: () => tournamentPreview,
            getTournamentBuildConfig: () => tournamentBuildConfig,
            buildSelectedSession,
            getTeamCount: () => teamCount,
            getCourtCount,
            getNotStrictDoubles,
            onSessionStart: (session) => {
                globalState.activeSession = session
                saveState()
                refreshSessionView()
            },
        }),
    )
}

function bindSetupControls() {
    bindSelectionButtons({
        teamsDecBtn,
        teamsIncBtn,
        selectAllBtn,
        deselectAllBtn,
        getTeamCount: () => teamCount,
        setTeamCount: (value) => {
            teamCount = value
        },
        getSelectedPlayers: () => selectedPlayers,
        getSelectedCount: () => selectedPlayers.size,
        getRoster: () => globalState.roster,
        setSelectedPlayers: (next) => {
            selectedPlayers = next
        },
        renderPlayerSelection,
        playerSelection,
        onSelectionChange,
    })
    bindStartSessionButton()
    bindActiveSessionNavButtons({
        uiState,
        onPrevRoundClick,
        onNextRoundClick,
        onPrevTournamentClick,
        onNextTournamentClick,
        onSkipTournamentClick,
        endSessionBtn,
        onEndSessionClick,
    })
    bindTournamentSeriesToggle({ uiState, tournamentSeriesNavToggleBtn, setTournamentSeriesNavCollapsedUi })
    initCourtConfig(onSelectionChange)
    initTournamentSetup(onSelectionChange)
    allow2v1Checkbox.addEventListener("change", () => {
        setNotStrictDoubles(allow2v1Checkbox.checked)
        onSelectionChange()
    })
    bindModeButtons(modeSelector, onModeChange)
}

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn

    bindSetupControls()
    initNavigation({
        state,
        saveFn: persistFn,
        confirmFn,
        renderFn: () => renderActiveSession(globalState, saveState, uiState),
        refreshFn: refreshSessionView,
    })
    syncInitialGoTopButtonState(globalState, uiState, syncGoTopButtonVisibility)
}

function onModeChange(mode) {
    handleModeChange({
        mode,
        setGameMode: (value) => {
            gameMode = value
        },
        setTeamCount: (value) => {
            teamCount = value
        },
        modeSelector,
        teamsConfig,
        modeHint,
        showTournamentConfig,
        updateTournamentHint,
        setCourtVisibility,
        getTournamentMatchMode,
        hideTournamentConfig,
        resetTournamentSetup,
        resetCourtCount,
        syncAllow2v1Visibility,
        selectedPlayersCount: selectedPlayers.size,
        allow2v1Checkbox,
        setNotStrictDoubles,
        onSelectionChange,
    })
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
        updateTournamentPlayers([...selectedPlayers])
        clampCourtCount(count, tournamentMatchMode)
        clearCourtHint()
        const previewState = updateTournamentPreview({
            selectedPlayers,
            count,
            minPlayers,
            getCourtCount,
            getNotStrictDoubles,
            getTournamentConfig,
            buildTournamentPreview,
            tournamentDistributionGroup,
            tournamentDistributionHint,
            tournamentAdvancedError,
        })
        const {
            canStartTournament,
            tournamentPreview: nextTournamentPreview,
            tournamentBuildConfig: nextBuildConfig,
        } = previewState
        tournamentPreview = nextTournamentPreview
        tournamentBuildConfig = nextBuildConfig
        startSessionBtn.disabled = count < minPlayers || !canStartTournament
    } else if (gameMode === "free") {
        updateTeamSizeHint(count, teamCount, teamSizeHint)
        modeHint.textContent = ""
        clampCourtCount(count, gameMode)
        updateCourtHint(count, gameMode)
        clearTournamentDistribution({
            tournamentDistributionGroup,
            tournamentDistributionHint,
            tournamentAdvancedError,
        })
        tournamentPreview = null
        tournamentBuildConfig = null
        startSessionBtn.disabled = count < 2
    }
}

function refreshSessionView() {
    const viewState = refreshSessionViewState({
        globalState,
        saveState,
        sessionSetup,
        sessionActive,
        uiState,
        renderActiveSessionView,
        renderActiveSession,
        syncGoTopButtonVisibility,
        showSetupSessionView,
        resetGoTopButtonVisibility,
        noRosterWarning,
        sessionConfig,
        selectedPlayers,
        reconcileSelectedPlayersWithRoster,
        syncAllow2v1Visibility,
        setTournamentSeriesNavCollapsedUi,
        tournamentSeriesNavToggleBtn,
        renderPlayerSelection,
        playerSelection,
        onSelectionChange,
        modeSelector,
        syncModeSelectorSelection,
        gameMode,
        teamsConfig,
        showTournamentConfig,
        hideTournamentConfig,
        setCourtVisibility,
        getTournamentMatchMode,
        clearTournamentDistribution,
        tournamentDistributionGroup,
        tournamentDistributionHint,
        tournamentAdvancedError,
        teamCount,
        syncTeamCountControls,
        teamCountValue,
        teamsDecBtn,
        teamsIncBtn,
    })
    const { selectedPlayers: nextSelectedPlayers, teamCount: nextTeamCount } = viewState
    selectedPlayers = nextSelectedPlayers
    teamCount = nextTeamCount
}

export { initSession, refreshSessionView }
