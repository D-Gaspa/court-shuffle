function bindActiveSessionNavButtons({
    uiState,
    onPrevRoundClick,
    onNextRoundClick,
    onPrevTournamentClick,
    onNextTournamentClick,
    onSkipTournamentClick,
    endSessionBtn,
    onEndSessionClick,
}) {
    uiState.prevRoundBtn.addEventListener("click", onPrevRoundClick)
    uiState.nextRoundBtn.addEventListener("click", onNextRoundClick)
    uiState.goTopBtn?.addEventListener("click", () => globalThis.scrollTo({ top: 0, behavior: "smooth" }))
    uiState.prevTournamentBtn?.addEventListener("click", onPrevTournamentClick)
    uiState.nextTournamentBtn?.addEventListener("click", onNextTournamentClick)
    uiState.skipTournamentBtn?.addEventListener("click", onSkipTournamentClick)
    endSessionBtn.addEventListener("click", onEndSessionClick)
}

function bindTournamentSeriesToggle({ uiState, tournamentSeriesNavToggleBtn, setTournamentSeriesNavCollapsedUi }) {
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

export { bindActiveSessionNavButtons, bindTournamentSeriesToggle }
