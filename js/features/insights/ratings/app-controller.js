import { renderRatings } from "./render.js"

function createRatingsAppController({
    onArchiveCurrentSeason,
    onStartRatingSeason,
    persist,
    ratingsRoot,
    showConfirmDialog,
    state,
}) {
    function refreshRatings() {
        renderRatings({
            history: state.history,
            ratings: state.ratings,
            root: ratingsRoot,
            onArchiveCurrentSeason,
            onDeleteArchivedSeason: handleDeleteArchivedSeason,
            onStartRatingSeason,
        })
    }

    function handleDeleteArchivedSeason(seasonId) {
        const season = (state.ratings?.seasons || []).find(
            (entry) => entry.id === seasonId && entry.status === "archived",
        )
        if (!season) {
            return
        }
        showConfirmDialog(
            "Delete Archived Season",
            `Delete archived season "${season.label}"? This removes its saved snapshot from local storage.`,
            () => {
                state.ratings = {
                    ...(state.ratings || {}),
                    seasons: (state.ratings?.seasons || []).filter((entry) => entry.id !== seasonId),
                }
                persist()
                refreshRatings()
            },
            {
                okLabel: "Delete Season",
                okClass: "btn-danger",
            },
        )
    }

    return {
        refreshRatings,
    }
}

export { createRatingsAppController }
