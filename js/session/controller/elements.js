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
    goTopBtn: document.getElementById("go-top-btn"),
    sessionBottomActions: document.getElementById("session-bottom-actions"),
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

export {
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
}
