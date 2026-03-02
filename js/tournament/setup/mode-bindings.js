function bindTournamentFormatButtons(formatSelector, onSelect) {
    for (const button of formatSelector.querySelectorAll(".format-btn")) {
        button.addEventListener("click", () => {
            const nextFormat = button.dataset.format
            for (const option of formatSelector.querySelectorAll(".format-btn")) {
                option.classList.toggle("selected", option === button)
            }
            onSelect(nextFormat)
        })
    }
}

function bindTournamentTeamSizeButtons(teamSizeSelector, onSelect) {
    for (const button of teamSizeSelector.querySelectorAll(".team-size-btn")) {
        button.addEventListener("click", () => {
            const nextSize = Number(button.dataset.teamSize)
            for (const option of teamSizeSelector.querySelectorAll(".team-size-btn")) {
                option.classList.toggle("selected", option === button)
            }
            onSelect(nextSize)
        })
    }
}

export { bindTournamentFormatButtons, bindTournamentTeamSizeButtons }
