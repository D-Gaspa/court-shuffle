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

export { setTournamentSeriesNavCollapsedUi }
