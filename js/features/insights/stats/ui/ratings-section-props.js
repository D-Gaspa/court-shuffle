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
    provisionalHistory,
    ratingsModel,
    ratingsState,
    selectedArchivedSeasonId,
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
        selectedArchivedSeasonId,
        selectedMode,
        selectedPlayer,
        selectedPreview,
        wrap,
    }
}

export { buildRatingsBoardProps, buildRatingsHeroProps }
