import { createPanelHeader } from "./dom.js"

function createEl(tag, className, text) {
    const el = document.createElement(tag)
    if (className) {
        el.className = className
    }
    if (text !== undefined) {
        el.textContent = text
    }
    return el
}

function createArchivePanel(ratingsState, { onDeleteArchivedSeason, onOpenArchivedSeason, selectedSeasonId } = {}) {
    const archivedSeasons = [
        ...(ratingsState?.seasons || []).filter((season) => season.status === "archived"),
    ].reverse()
    const section = createEl("section", "stats-panel")
    section.appendChild(
        createPanelHeader("Season archive", "Open old seasons for read-only review or remove them entirely."),
    )
    if (archivedSeasons.length === 0) {
        section.appendChild(createEl("p", "stats-relationship-empty", "No archived seasons yet."))
        return section
    }
    const list = createEl("div", "stats-player-list")
    for (const season of archivedSeasons) {
        const row = createArchiveRow({ onDeleteArchivedSeason, onOpenArchivedSeason, season, selectedSeasonId })
        list.appendChild(row)
    }
    section.appendChild(list)
    return section
}

function createArchiveRow({ onDeleteArchivedSeason, onOpenArchivedSeason, season, selectedSeasonId }) {
    const row = createEl("div", "stats-archive-row")
    const openButton = createEl(
        "button",
        `roster-item stats-player-row${selectedSeasonId === season.id ? " is-selected" : ""}`,
    )
    openButton.type = "button"
    openButton.addEventListener("click", () => onOpenArchivedSeason?.(season.id))
    const copy = createEl("div", "stats-player-name-wrap")
    copy.appendChild(createEl("span", "player-name", season.label))
    copy.appendChild(
        createEl(
            "span",
            "stats-ratings-rank",
            `${season.startedAt.slice(0, 10)} → ${season.endedAt ? season.endedAt.slice(0, 10) : "—"}`,
        ),
    )
    openButton.appendChild(copy)
    const meta = createEl("div", "stats-player-row-meta")
    meta.appendChild(createEl("span", "stats-player-row-pill", "Open Archive"))
    openButton.appendChild(meta)
    row.appendChild(openButton)

    const deleteButton = createEl("button", "btn btn-ghost btn-sm stats-archive-delete-btn", "Delete")
    deleteButton.type = "button"
    deleteButton.addEventListener("click", () => onDeleteArchivedSeason?.(season.id))
    row.appendChild(deleteButton)
    return row
}

export { createArchivePanel }
