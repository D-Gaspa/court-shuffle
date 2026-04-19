const sessionSetup = document.getElementById("session-setup")
const sessionActive = document.getElementById("session-active")
const noRosterWarning = document.getElementById("no-roster-warning")
const sessionConfig = document.getElementById("session-config")
const sessionSetupTitle = document.getElementById("session-setup-title")
const sessionSetupSubtitle = document.getElementById("session-setup-subtitle")
const sessionContinuationBanner = document.getElementById("session-continuation-banner")
const sessionContinuationTitle = document.getElementById("session-continuation-title")
const sessionContinuationDetail = document.getElementById("session-continuation-detail")
const sessionContinuationPhaseTag = document.getElementById("session-continuation-phase-tag")
const sessionContinuationTournamentTag = document.getElementById("session-continuation-tournament-tag")
const sessionPrefillCancelBtn = document.getElementById("session-prefill-cancel-btn")
const sessionSetupNotice = document.getElementById("session-setup-notice")
const playerSelection = document.getElementById("player-selection")
const selectAllBtn = document.getElementById("select-all-btn")
const deselectAllBtn = document.getElementById("deselect-all-btn")
const sessionStepper = document.getElementById("session-stepper")
const sessionStepCaption = document.getElementById("session-step-caption")
const sessionBackBtn = document.getElementById("session-back-btn")
const sessionNextBtn = document.getElementById("session-next-btn")
const modeSelector = document.getElementById("mode-selector")
const modeHint = document.getElementById("mode-hint")
const teamsConfig = document.getElementById("teams-config")
const tournamentSetupPanel = document.getElementById("tournament-setup-panel")
const teamsDecBtn = document.getElementById("teams-dec")
const teamsIncBtn = document.getElementById("teams-inc")
const teamCountValue = document.getElementById("team-count-value")
const teamSizeHint = document.getElementById("team-size-hint")
const startSessionBtn = document.getElementById("start-session-btn")
const startSessionLabel = document.getElementById("start-session-label")
const sessionLoadingOverlay = document.getElementById("session-loading-overlay")
const sessionLoadingMessage = document.getElementById("session-loading-message")
const notStrictDoublesGroup = document.getElementById("not-strict-doubles")
const allow2v1Checkbox = document.getElementById("allow-2v1")
const tournamentDistributionGroup = document.getElementById("tournament-distribution-group")
const tournamentDistributionHint = document.getElementById("tournament-distribution-hint")
const tournamentAdvancedError = document.getElementById("tournament-advanced-error")
const continuationSummary = document.getElementById("continuation-summary")
const continuationSummaryBody = document.getElementById("continuation-summary-body")
const tournamentConfig = document.getElementById("tournament-config")
const formatSelector = document.getElementById("format-selector")
const teamSizeSelector = document.getElementById("tournament-team-size")
const tournamentHint = document.getElementById("tournament-hint")
const courtsConfig = document.getElementById("courts-config")
const courtsDecBtn = document.getElementById("courts-dec")
const courtsIncBtn = document.getElementById("courts-inc")
const courtCountValue = document.getElementById("court-count-value")
const courtCountLabel = document.getElementById("court-count-label")
const courtHint = document.getElementById("court-hint")

const sessionStepButtons = [...document.querySelectorAll("[data-session-step]")]
const sessionStepPanels = [...document.querySelectorAll("[data-session-step-panel]")]

const uiState = {
    continueSessionBtn: document.getElementById("continue-session-btn"),
    undoTournamentBtn: document.getElementById("undo-tournament-btn"),
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
    courtCountLabel,
    courtCountValue,
    courtHint,
    courtsConfig,
    courtsDecBtn,
    courtsIncBtn,
    continuationSummary,
    continuationSummaryBody,
    deselectAllBtn,
    endSessionBtn,
    formatSelector,
    modeHint,
    modeSelector,
    noRosterWarning,
    notStrictDoublesGroup,
    playerSelection,
    selectAllBtn,
    sessionBackBtn,
    sessionActive,
    sessionConfig,
    sessionNextBtn,
    sessionLoadingOverlay,
    sessionLoadingMessage,
    sessionSetupNotice,
    sessionContinuationBanner,
    sessionContinuationDetail,
    sessionContinuationPhaseTag,
    sessionContinuationTitle,
    sessionContinuationTournamentTag,
    sessionPrefillCancelBtn,
    sessionSetupSubtitle,
    sessionSetupTitle,
    sessionStepButtons,
    sessionStepCaption,
    sessionStepPanels,
    sessionStepper,
    sessionSetup,
    startSessionBtn,
    startSessionLabel,
    teamCountValue,
    teamSizeHint,
    teamSizeSelector,
    tournamentAdvancedError,
    tournamentConfig,
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentHint,
    tournamentSetupPanel,
    teamsConfig,
    teamsDecBtn,
    teamsIncBtn,
    tournamentSeriesNavToggleBtn,
    uiState,
}
