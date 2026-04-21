import { createEl, createPanelHeader } from "./dom.js"
import { createArchivePanel } from "./ratings-archive.js"
import { createRatingsBoard } from "./ratings-board.js"
import { createRatingsHero } from "./ratings-hero.js"
import { buildLatestSessionStoryMap, collectLiveParticipantSet } from "./ratings-live.js"
import { buildRatingsBoardProps, buildRatingsHeroProps } from "./ratings-section-props.js"
import { createTrendPanel } from "./ratings-trend.js"

function resolveRatingsBoardState({
    hasLivePreview,
    history,
    isArchivedView,
    liveBaselineModel,
    provisionalHistory,
    ratingsState,
    selectedMode,
    selectedPreview,
}) {
    const comparisonLadder =
        hasLivePreview && selectedPreview === "live" && !isArchivedView ? liveBaselineModel.ladders[selectedMode] : null
    return {
        comparisonLadder,
        latestStoryMap:
            !(comparisonLadder || isArchivedView) && selectedPreview === "season"
                ? buildLatestSessionStoryMap(history, selectedMode, ratingsState)
                : new Map(),
        liveParticipantSet:
            comparisonLadder && selectedPreview === "live"
                ? collectLiveParticipantSet(provisionalHistory, selectedMode)
                : new Set(),
    }
}

function appendRatingsContent({
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    ratingsState,
    selectedArchivedSeasonId,
    wrap,
}) {
    wrap.appendChild(
        createArchivePanel(ratingsState, {
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            selectedSeasonId: selectedArchivedSeasonId,
        }),
    )
}

function appendRatingsEmptyState({
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    onStartSeason,
    ratingsModel,
    ratingsState,
    selectedArchivedSeasonId,
    selectedMode,
    wrap,
}) {
    if (!ratingsModel.season) {
        wrap.appendChild(createSeasonEmptyPanel(onStartSeason))
        appendRatingsContent({
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            ratingsState,
            selectedArchivedSeasonId,
            wrap,
        })
        return true
    }

    if (ratingsModel.ladders[selectedMode].leaderboard.length === 0) {
        wrap.appendChild(createEmptyLadderPanel(ratingsModel.season, selectedMode))
        appendRatingsContent({
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            ratingsState,
            selectedArchivedSeasonId,
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
    onSelectTrendGrouping,
    onSelectPlayer,
    provisionalHistory,
    ratingsModel,
    ratingsState,
    selectedMode,
    selectedPlayer,
    selectedPreview,
    selectedTrendGrouping,
    wrap,
}) {
    const ladder = ratingsModel.ladders[selectedMode]
    const { comparisonLadder, latestStoryMap, liveParticipantSet } = resolveRatingsBoardState({
        hasLivePreview,
        history,
        isArchivedView,
        liveBaselineModel,
        provisionalHistory,
        ratingsState,
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
        createTrendPanel({
            isArchivedView,
            ladder,
            onSelectTrendGrouping,
            selectedPlayer,
            season: ratingsModel.season,
            selectedMode,
            selectedTrendGrouping,
        }),
    )
}

function appendRatingsPanels(props) {
    appendRatingsBoard(props)
    appendRatingsContent(props)
}

function appendRatingsHero({
    hasLivePreview,
    isArchivedView,
    onArchiveCurrentSeason,
    onBackToActiveSeason,
    onSelectMode,
    onSelectPreview,
    onStartSeason,
    ratingsModel,
    ratingsState,
    selectedMode,
    selectedPreview,
    wrap,
}) {
    wrap.appendChild(
        createRatingsHero(
            buildRatingsHeroProps({
                hasLivePreview,
                isArchivedView,
                onArchiveCurrentSeason,
                onBackToActiveSeason,
                onSelectMode,
                onSelectPreview,
                onStartSeason,
                ratingsModel,
                ratingsState,
                selectedMode,
                selectedPreview,
            }),
        ),
    )
}

function buildRatingsSection({
    hasLivePreview,
    history,
    isArchivedView,
    liveBaselineModel,
    onArchiveCurrentSeason,
    provisionalHistory,
    ratingsModel,
    ratingsState,
    selectedArchivedSeasonId,
    selectedMode,
    selectedPreview,
    selectedPlayer,
    onBackToActiveSeason,
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    onSelectMode,
    onSelectPreview,
    onSelectPlayer,
    onSelectTrendGrouping,
    onStartSeason,
    selectedTrendGrouping,
}) {
    const wrap = document.createElement("div")
    wrap.className = "stats-section-grid"
    appendRatingsHero({
        hasLivePreview,
        isArchivedView,
        onArchiveCurrentSeason,
        onBackToActiveSeason,
        onSelectMode,
        onSelectPreview,
        onStartSeason,
        ratingsModel,
        ratingsState,
        selectedMode,
        selectedPreview,
        wrap,
    })
    if (
        appendRatingsEmptyState({
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            onStartSeason,
            ratingsModel,
            ratingsState,
            selectedArchivedSeasonId,
            selectedMode,
            wrap,
        })
    ) {
        return wrap
    }

    appendRatingsPanels(
        buildRatingsBoardProps({
            hasLivePreview,
            history,
            isArchivedView,
            liveBaselineModel,
            onDeleteArchivedSeason,
            onOpenArchivedSeason,
            onSelectPlayer,
            onSelectTrendGrouping,
            provisionalHistory,
            ratingsModel,
            ratingsState,
            selectedArchivedSeasonId,
            selectedMode,
            selectedPlayer,
            selectedPreview,
            selectedTrendGrouping,
            wrap,
        }),
    )
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
