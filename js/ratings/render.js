import { buildRatingsSection } from "../stats/view/ratings.js"
import { buildArchivedRatingsModel, buildRatingsModel } from "./model.js"

let selectedRatingsMode = "singles"
let selectedRatingsPlayerByMode = {
    singles: null,
    doubles: null,
}
let selectedArchivedSeasonId = null
let lastRenderArgs = null

function renderRatings({ history, ratings, root, onDeleteArchivedSeason, onStartRatingSeason }) {
    if (!root) {
        return
    }
    lastRenderArgs = { history, ratings, root, onDeleteArchivedSeason, onStartRatingSeason }
    root.textContent = ""
    const shell = createRatingsShell()
    const activeRatingsModel = buildRatingsModel({ history, ratings })
    const archivedRatingsModel = selectedArchivedSeasonId
        ? buildArchivedRatingsModel(ratings, selectedArchivedSeasonId)
        : null
    if (selectedArchivedSeasonId && !archivedRatingsModel) {
        selectedArchivedSeasonId = null
    }
    const ratingsModel = archivedRatingsModel || activeRatingsModel
    const selectedPlayer = resolveSelectedRatingsPlayer(ratingsModel)
    const board = document.createElement("div")
    board.className = "stats-board"
    board.appendChild(
        buildRatingsSection({
            ratingsModel,
            ratingsState: ratings,
            isArchivedView: Boolean(archivedRatingsModel),
            selectedMode: selectedRatingsMode,
            selectedPlayer,
            onBackToActiveSeason: handleBackToActiveSeason,
            onDeleteArchivedSeason: handleDeleteArchivedSeason(onDeleteArchivedSeason),
            onOpenArchivedSeason: handleOpenArchivedSeason,
            onSelectMode: handleRatingsModeChange,
            onSelectPlayer: handleRatingsPlayerSelection,
            onStartSeason: onStartRatingSeason,
        }),
    )
    shell.appendChild(board)
    root.appendChild(shell)
}

function createRatingsShell() {
    const shell = document.createElement("div")
    shell.className = "stats-shell"
    const header = document.createElement("div")
    header.className = "view-header stats-view-header"
    const title = document.createElement("h1")
    title.textContent = "Ratings Seasons"
    const subtitle = document.createElement("p")
    subtitle.textContent = "Season-scoped ladders, trendlines, and read-only archives."
    header.appendChild(title)
    header.appendChild(subtitle)
    shell.appendChild(header)
    return shell
}

function resolveSelectedRatingsPlayer(ratingsModel) {
    const ladder = ratingsModel.ladders[selectedRatingsMode]
    if (ladder.leaderboard.length === 0) {
        selectedRatingsPlayerByMode[selectedRatingsMode] = null
        return null
    }
    const selectedPlayer = selectedRatingsPlayerByMode[selectedRatingsMode]
    if (selectedPlayer && ladder.leaderboard.includes(selectedPlayer)) {
        return selectedPlayer
    }
    selectedRatingsPlayerByMode = {
        ...selectedRatingsPlayerByMode,
        [selectedRatingsMode]: ladder.leaderboard[0],
    }
    return ladder.leaderboard[0]
}

function handleOpenArchivedSeason(seasonId) {
    selectedArchivedSeasonId = seasonId
    rerenderRatings()
}

function handleBackToActiveSeason() {
    if (!selectedArchivedSeasonId) {
        return
    }
    selectedArchivedSeasonId = null
    rerenderRatings()
}

function handleDeleteArchivedSeason(onDeleteArchivedSeason) {
    return (seasonId) => {
        if (typeof onDeleteArchivedSeason === "function") {
            onDeleteArchivedSeason(seasonId)
        }
    }
}

function handleRatingsModeChange(mode) {
    if (selectedRatingsMode === mode) {
        return
    }
    selectedRatingsMode = mode
    rerenderRatings()
}

function handleRatingsPlayerSelection(name) {
    selectedRatingsPlayerByMode = {
        ...selectedRatingsPlayerByMode,
        [selectedRatingsMode]: name,
    }
    rerenderRatings()
}

function rerenderRatings() {
    if (!lastRenderArgs) {
        return
    }
    renderRatings(lastRenderArgs)
}

export { renderRatings }
