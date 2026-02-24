const MIN_ODD_DOUBLES_TOURNAMENT_PLAYERS = 3

function setTournamentSeriesNavCollapsedUi(ui, isCollapsed) {
    const navEl = ui?.tournamentSeriesNav
    const toggleBtn = ui?.tournamentSeriesNavToggleBtn
    if (!(navEl && toggleBtn)) {
        return
    }
    navEl.classList.toggle("is-collapsed", isCollapsed)
    toggleBtn.setAttribute("aria-expanded", String(!isCollapsed))
    toggleBtn.setAttribute(
        "aria-label",
        isCollapsed ? "Expand mini tournament controls" : "Collapse mini tournament controls",
    )
    toggleBtn.title = isCollapsed ? "Expand" : "Collapse"
}

function syncAllow2v1Visibility({
    playerCount,
    gameMode,
    tournamentMatchMode,
    notStrictDoublesGroup,
    allow2v1Checkbox,
    setNotStrictDoubles,
}) {
    const isTournamentDoubles = gameMode === "tournament" && tournamentMatchMode === "doubles"
    const canUseTwoVsOne =
        isTournamentDoubles && playerCount >= MIN_ODD_DOUBLES_TOURNAMENT_PLAYERS && playerCount % 2 === 1

    notStrictDoublesGroup.hidden = !isTournamentDoubles
    allow2v1Checkbox.disabled = !canUseTwoVsOne
    if (!canUseTwoVsOne) {
        allow2v1Checkbox.checked = false
        setNotStrictDoubles(false)
    }
}

function syncTeamCountControls({ teamCount, selectedCount, teamCountValue, teamsDecBtn, teamsIncBtn }) {
    let nextTeamCount = teamCount
    const max = Math.max(2, selectedCount)
    if (nextTeamCount > max) {
        nextTeamCount = max
    }
    if (nextTeamCount < 2) {
        nextTeamCount = 2
    }

    teamCountValue.textContent = nextTeamCount
    teamsDecBtn.disabled = nextTeamCount <= 2
    teamsIncBtn.disabled = nextTeamCount >= selectedCount || selectedCount < 2
    return nextTeamCount
}

export { setTournamentSeriesNavCollapsedUi, syncAllow2v1Visibility, syncTeamCountControls }
