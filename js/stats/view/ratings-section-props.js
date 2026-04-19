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
    onDeleteArchivedSeason,
    onOpenArchivedSeason,
    onSelectPlayer,
    provisionalHistory,
    ratingsModel,
    ratingsState,
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
        onDeleteArchivedSeason,
        onOpenArchivedSeason,
        onSelectPlayer,
        provisionalHistory,
        ratingsModel,
        ratingsState,
        selectedMode,
        selectedPlayer,
        selectedPreview,
        wrap,
    }
}

export { buildRatingsBoardProps, buildRatingsHeroProps }
