import { createPanelHeader } from "./dom.js"
import { createArchivePanel } from "./ratings-archive.js"
import { createRatingsBoard } from "./ratings-board.js"
import { createRatingsHero } from "./ratings-hero.js"
import { buildLatestSessionStoryMap, collectLiveParticipantSet } from "./ratings-live.js"
import { createTrendPanel } from "./ratings-trend.js"

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

function resolveRatingsBoardState({
    hasLivePreview,
    history,
    isArchivedView,
    liveBaselineModel,
    provisionalHistory,
    selectedMode,
    selectedPreview,
}) {
    const comparisonLadder =
        hasLivePreview && selectedPreview === "live" && !isArchivedView ? liveBaselineModel.ladders[selectedMode] : null
    return {
        comparisonLadder,
        latestStoryMap:
            !(comparisonLadder || isArchivedView) && selectedPreview === "season"
                ? buildLatestSessionStoryMap(history, selectedMode)
                : new Map(),
        liveParticipantSet:
            comparisonLadder && selectedPreview === "live"
                ? collectLiveParticipantSet(provisionalHistory, selectedMode)
                : new Set(),
    }
}

function appendRatingsContent({ onDeleteArchivedSeason, onOpenArchivedSeason, ratingsModel, ratingsState, wrap }) {
    wrap.appendChild(
        createArchivePanel(ratingsState, {
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            selectedSeasonId: ratingsModel.season?.id,
        }),
    )
}

function appendRatingsHero(wrap, heroProps) {
    wrap.appendChild(createRatingsHero(heroProps))
}

function appendRatingsEmptyState({
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    onStartSeason,
    ratingsModel,
    ratingsState,
    selectedMode,
    wrap,
}) {
    if (!ratingsModel.season) {
        wrap.appendChild(createSeasonEmptyPanel(onStartSeason))
        appendRatingsContent({
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            ratingsModel,
            ratingsState,
            wrap,
        })
        return true
    }

    if (ratingsModel.ladders[selectedMode].leaderboard.length === 0) {
        wrap.appendChild(createEmptyLadderPanel(ratingsModel.season, selectedMode))
        appendRatingsContent({
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            ratingsModel,
            ratingsState,
            wrap,
        })
        return true
    }

    return false
}

function appendRatingsBoard({
    hasLivePreview,
    history,
    isArchivedView,
    liveBaselineModel,
    onSelectPlayer,
    provisionalHistory,
    ratingsModel,
    selectedMode,
    selectedPlayer,
    selectedPreview,
    wrap,
}) {
    const ladder = ratingsModel.ladders[selectedMode]
    const { comparisonLadder, latestStoryMap, liveParticipantSet } = resolveRatingsBoardState({
        hasLivePreview,
        history,
        isArchivedView,
        liveBaselineModel,
        provisionalHistory,
        selectedMode,
        selectedPreview,
    })
    wrap.appendChild(
        createRatingsBoard({
            comparisonLadder,
            ladder,
            liveParticipantSet,
            latestStoryMap,
            selectedPlayer,
            onSelectPlayer,
        }),
    )
    wrap.appendChild(
        createTrendPanel({ isArchivedView, ladder, selectedPlayer, season: ratingsModel.season, selectedMode }),
    )
}

function buildRatingsHeroProps({
    hasLivePreview,
    isArchivedView,
    onBackToActiveSeason,
    onSelectMode,
    onSelectPreview,
    onStartSeason,
    ratingsModel,
    ratingsState,
    selectedMode,
    selectedPreview,
}) {
    return {
        hasLivePreview,
        isArchivedView,
        onBackToActiveSeason,
        onStartSeason,
        ratingsModel,
        ratingsState,
        selectedMode,
        selectedPreview,
        onSelectMode,
        onSelectPreview,
    }
}

function buildRatingsBoardProps({
    hasLivePreview,
    history,
    isArchivedView,
    liveBaselineModel,
    onSelectPlayer,
    provisionalHistory,
    ratingsModel,
    selectedMode,
    selectedPlayer,
    selectedPreview,
    wrap,
}) {
    return {
        hasLivePreview,
        history,
        isArchivedView,
        liveBaselineModel,
        onSelectPlayer,
        provisionalHistory,
        ratingsModel,
        selectedMode,
        selectedPlayer,
        selectedPreview,
        wrap,
    }
}

function buildRatingsSection({
    hasLivePreview,
    history,
    isArchivedView,
    liveBaselineModel,
    provisionalHistory,
    ratingsModel,
    ratingsState,
    selectedMode,
    selectedPreview,
    selectedPlayer,
    onBackToActiveSeason,
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    onSelectMode,
    onSelectPreview,
    onSelectPlayer,
    onStartSeason,
}) {
    const wrap = document.createElement("div")
    wrap.className = "stats-section-grid"
    appendRatingsHero(
        wrap,
        buildRatingsHeroProps({
            hasLivePreview,
            isArchivedView,
            onBackToActiveSeason,
            onSelectMode,
            onSelectPreview,
            onStartSeason,
            ratingsModel,
            ratingsState,
            selectedMode,
            selectedPreview,
        }),
    )
    if (
        appendRatingsEmptyState({
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            onStartSeason,
            ratingsModel,
            ratingsState,
            selectedMode,
            wrap,
        })
    ) {
        return wrap
    }

    appendRatingsBoard(
        buildRatingsBoardProps({
            hasLivePreview,
            history,
            isArchivedView,
            liveBaselineModel,
            onSelectPlayer,
            provisionalHistory,
            ratingsModel,
            selectedMode,
            selectedPlayer,
            selectedPreview,
            wrap,
        }),
    )
    appendRatingsContent({
        onDeleteArchivedSeason,
        onOpenArchivedSeason,
        ratingsModel,
        ratingsState,
        wrap,
    })
    return wrap
}

function createSeasonEmptyPanel(onStartSeason) {
    const panel = createEl("section", "stats-panel stats-panel-ratings-empty")
    panel.appendChild(
        createPanelHeader("No active rating season", "Ratings stay dormant until a labeled season is started."),
    )
    panel.appendChild(
        createEl(
            "p",
            "stats-relationship-empty",
            "Start a season to replay current active history into a live singles and doubles ladder.",
        ),
    )
    const button = createEl("button", "btn btn-primary stats-ratings-panel-btn", "Start Rating Season")
    button.type = "button"
    button.addEventListener("click", onStartSeason)
    panel.appendChild(button)
    return panel
}

function createEmptyLadderPanel(season, selectedMode) {
    const panel = createEl("section", "stats-panel stats-panel-ratings-empty")
    panel.appendChild(
        createPanelHeader(
            `${season.label} ${selectedMode} ladder`,
            "The season is active, but no eligible rated matches have landed in this ladder yet.",
        ),
    )
    panel.appendChild(
        createEl(
            "p",
            "stats-relationship-empty",
            selectedMode === "singles"
                ? "Save at least one decided singles tournament match in this season to populate the ladder."
                : "Save at least one decided doubles tournament match in this season to populate the ladder.",
        ),
    )
    return panel
}

export { buildRatingsSection }
