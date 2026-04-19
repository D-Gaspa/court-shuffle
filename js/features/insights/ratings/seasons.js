const DEFAULT_BASELINE_RATING = 1500
const DEFAULT_ESTABLISHED_K = 24
const DEFAULT_PROVISIONAL_K = 40
const DEFAULT_PROVISIONAL_MATCH_THRESHOLD = 10

function createDefaultSeasonTuning() {
    return {
        establishedK: DEFAULT_ESTABLISHED_K,
        provisionalK: DEFAULT_PROVISIONAL_K,
        provisionalMatchThreshold: DEFAULT_PROVISIONAL_MATCH_THRESHOLD,
    }
}

function createEmptyRatingsState() {
    return {
        currentSeasonId: null,
        seasons: [],
    }
}

function createSeasonId(label, startedAt) {
    const slug = String(label || "season")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    const date = String(startedAt || new Date().toISOString()).slice(0, 10)
    return `${slug || "season"}-${date}`
}

function createRatingSeason({
    label,
    startedAt = new Date().toISOString(),
    baselineRating = DEFAULT_BASELINE_RATING,
    tuning,
}) {
    const resolvedStartedAt = startedAt || new Date().toISOString()
    return {
        id: createSeasonId(label, resolvedStartedAt),
        label,
        startedAt: resolvedStartedAt,
        endedAt: null,
        status: "active",
        baselineRating,
        tuning: {
            ...createDefaultSeasonTuning(),
            ...(tuning || {}),
        },
        snapshots: {
            singles: null,
            doubles: null,
        },
    }
}

function getActiveRatingSeason(ratingsState) {
    if (!ratingsState?.currentSeasonId) {
        return null
    }
    return ratingsState.seasons.find((season) => season.id === ratingsState.currentSeasonId) || null
}

function closeRatingSeason(season, endedAt, snapshots = {}) {
    if (!season) {
        return null
    }
    return {
        ...season,
        endedAt,
        status: "archived",
        snapshots: {
            singles: snapshots.singles ?? season.snapshots?.singles ?? null,
            doubles: snapshots.doubles ?? season.snapshots?.doubles ?? null,
        },
    }
}

function archiveCurrentRatingSeason({ ratings, endedAt = new Date().toISOString(), snapshots }) {
    const currentRatings = ratings || createEmptyRatingsState()
    if (!currentRatings.currentSeasonId) {
        return currentRatings
    }
    return {
        currentSeasonId: null,
        seasons: currentRatings.seasons.map((season) =>
            season.id === currentRatings.currentSeasonId ? closeRatingSeason(season, endedAt, snapshots) : season,
        ),
    }
}

function startNewRatingSeason({ ratings, label, startedAt = new Date().toISOString(), snapshots }) {
    const currentRatings = ratings || createEmptyRatingsState()
    const nextSeason = createRatingSeason({ label, startedAt })
    const archivedState = archiveCurrentRatingSeason({
        ratings: currentRatings,
        endedAt: startedAt,
        snapshots,
    })
    return {
        currentSeasonId: nextSeason.id,
        seasons: [...archivedState.seasons, nextSeason],
    }
}

export {
    archiveCurrentRatingSeason,
    DEFAULT_BASELINE_RATING,
    DEFAULT_ESTABLISHED_K,
    DEFAULT_PROVISIONAL_K,
    DEFAULT_PROVISIONAL_MATCH_THRESHOLD,
    createDefaultSeasonTuning,
    createEmptyRatingsState,
    createRatingSeason,
    getActiveRatingSeason,
    startNewRatingSeason,
}
