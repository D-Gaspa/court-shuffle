function bindSelectionButtons({
    teamsDecBtn,
    teamsIncBtn,
    selectAllBtn,
    deselectAllBtn,
    getTeamCount,
    setTeamCount,
    getSelectedPlayers,
    getSelectedCount,
    getRoster,
    setSelectedPlayers,
    renderPlayerSelection,
    playerSelection,
    onSelectionChange,
}) {
    teamsDecBtn.addEventListener("click", () => {
        if (getTeamCount() <= 2) {
            return
        }
        setTeamCount(getTeamCount() - 1)
        onSelectionChange()
    })

    teamsIncBtn.addEventListener("click", () => {
        if (getTeamCount() >= getSelectedCount()) {
            return
        }
        setTeamCount(getTeamCount() + 1)
        onSelectionChange()
    })

    selectAllBtn.addEventListener("click", () => {
        const roster = getRoster()
        setSelectedPlayers(new Set(roster))
        renderPlayerSelection(roster, getSelectedPlayers(), playerSelection, onSelectionChange)
        onSelectionChange()
    })

    deselectAllBtn.addEventListener("click", () => {
        const roster = getRoster()
        setSelectedPlayers(new Set())
        renderPlayerSelection(roster, getSelectedPlayers(), playerSelection, onSelectionChange)
        onSelectionChange()
    })
}

export { bindSelectionButtons }
