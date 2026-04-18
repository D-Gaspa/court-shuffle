import { collectRatingEvents } from "./history-events.js"
import { replayRatingEvents } from "./replay.js"
import { getActiveRatingSeason } from "./seasons.js"

function buildSeasonSnapshot(ladder) {
    return {
        generatedAt: new Date().toISOString(),
        players: ladder.players,
        leaderboard: ladder.leaderboard,
    }
}

function buildRatingsModel({ history, ratings }) {
    const season = getActiveRatingSeason(ratings)
    if (!season) {
        return {
            season: null,
            ladders: {
                singles: {
                    leaderboard: [],
                    players: {},
                },
                doubles: {
                    leaderboard: [],
                    players: {},
                },
            },
        }
    }

    const events = collectRatingEvents(history, season)
    const ladders = replayRatingEvents(events, season)
    return {
        season: {
            id: season.id,
            label: season.label,
            startedAt: season.startedAt,
            endedAt: season.endedAt,
            status: season.status,
        },
        ladders,
    }
}

function buildSeasonSnapshots(model) {
    return {
        singles: buildSeasonSnapshot(model.ladders.singles),
        doubles: buildSeasonSnapshot(model.ladders.doubles),
    }
}

function buildArchivedLadder(snapshot) {
    if (!snapshot) {
        return {
            leaderboard: [],
            players: {},
        }
    }
    const players = {}
    for (const [name, player] of Object.entries(snapshot.players || {})) {
        players[name] = {
            ...player,
            trend: [],
        }
    }
    return {
        leaderboard: [...(snapshot.leaderboard || [])],
        players,
    }
}

function buildArchivedRatingsModel(ratings, seasonId) {
    const season = (ratings?.seasons || []).find((entry) => entry.id === seasonId && entry.status === "archived")
    if (!season) {
        return null
    }
    return {
        season: {
            id: season.id,
            label: season.label,
            startedAt: season.startedAt,
            endedAt: season.endedAt,
            status: season.status,
        },
        ladders: {
            singles: buildArchivedLadder(season.snapshots?.singles),
            doubles: buildArchivedLadder(season.snapshots?.doubles),
        },
    }
}

export { buildArchivedRatingsModel, buildRatingsModel, buildSeasonSnapshot, buildSeasonSnapshots }
