import { getCommittedHistory } from "../../session/live/provisional-history.js"
import { buildRatingsSection } from "../stats/ui/ratings.js"
import { buildLivePreviewAvailability } from "./live-preview.js"
import { buildArchivedRatingsModel, buildRatingsModel } from "./model.js"

let selectedRatingsMode = "singles"
let selectedRatingsPreview = "season"
let selectedRatingsPlayerByMode = {
    singles: null,
    doubles: null,
}
let selectedArchivedSeasonId = null
let lastRenderArgs = null

function renderRatings({
    history,
    ratings,
    root,
    onArchiveCurrentSeason,
    onDeleteArchivedSeason,
    onStartRatingSeason,
}) {
    if (!root) {
        return
    }
    lastRenderArgs = { history, ratings, root, onArchiveCurrentSeason, onDeleteArchivedSeason, onStartRatingSeason }
    root.textContent = ""
    const shell = createRatingsShell()
    const committedHistory = getCommittedHistory(history)
    const provisionalHistory = (history || []).filter((session) => session?.provisional === true)
    const committedRatingsModel = buildRatingsModel({ history: committedHistory, ratings })
    const liveRatingsModel = buildRatingsModel({ history, ratings })
    const livePreviewAvailability = buildLivePreviewAvailability(committedRatingsModel, liveRatingsModel)
    const hasLivePreview = livePreviewAvailability[selectedRatingsMode]
    if (!hasLivePreview && selectedRatingsPreview === "live") {
        selectedRatingsPreview = "season"
    }
    const visibleActiveRatingsModel = selectedRatingsPreview === "live" ? liveRatingsModel : committedRatingsModel
    const archivedRatingsModel = selectedArchivedSeasonId
        ? buildArchivedRatingsModel(ratings, selectedArchivedSeasonId)
        : null
    if (selectedArchivedSeasonId && !archivedRatingsModel) {
        selectedArchivedSeasonId = null
    }
    const ratingsModel = archivedRatingsModel || visibleActiveRatingsModel
    const selectedPlayer = resolveSelectedRatingsPlayer(ratingsModel)
    const board = document.createElement("div")
    board.className = "stats-board"
    board.appendChild(
        buildRatingsSection({
            history: committedHistory,
            ratingsModel,
            ratingsState: ratings,
            isArchivedView: Boolean(archivedRatingsModel),
            hasLivePreview,
            liveBaselineModel: committedRatingsModel,
            provisionalHistory,
            selectedMode: selectedRatingsMode,
            selectedPreview: selectedRatingsPreview,
            selectedPlayer,
            selectedArchivedSeasonId,
            onArchiveCurrentSeason,
            onBackToActiveSeason: handleBackToActiveSeason,
            onDeleteArchivedSeason: handleDeleteArchivedSeason(onDeleteArchivedSeason),
            onOpenArchivedSeason: handleOpenArchivedSeason,
            onSelectMode: handleRatingsModeChange,
            onSelectPreview: handleRatingsPreviewChange,
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

function handleRatingsPreviewChange(preview) {
    if (selectedRatingsPreview === preview) {
        return
    }
    selectedRatingsPreview = preview
    rerenderRatings()
}

function rerenderRatings() {
    if (!lastRenderArgs) {
        return
    }
    renderRatings(lastRenderArgs)
}

export { renderRatings }
