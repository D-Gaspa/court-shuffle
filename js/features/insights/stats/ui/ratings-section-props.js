function buildRatingsHeroProps({
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
}) {
    return {
        hasLivePreview,
        isArchivedView,
        onArchiveCurrentSeason,
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
}) {
    return {
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
    }
}

export { buildRatingsBoardProps, buildRatingsHeroProps }
