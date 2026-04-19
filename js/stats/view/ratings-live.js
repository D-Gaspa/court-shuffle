import { getHistoryTournamentRuns } from "../../history/session-phases.js"
import { resolveSessionSummary } from "../../history/session-summary.js"

function collectLiveParticipantSet(provisionalHistory, selectedMode) {
    const participants = new Set()
    const expectedTeamSize = selectedMode === "singles" ? 1 : 2
    for (const session of provisionalHistory || []) {
        for (const run of getHistoryTournamentRuns(session)) {
            if (run?.tournamentTeamSize !== expectedTeamSize) {
                continue
            }
            for (const player of run.players || []) {
                participants.add(player)
            }
        }
    }
    return participants
}

function buildLatestSessionStoryMap(history, selectedMode, ratings) {
    const matchingMode = selectedMode === "singles" ? "singles" : "doubles"
    for (let index = (history || []).length - 1; index >= 0; index -= 1) {
        const summary = resolveSessionSummary({
            entry: history[index],
            history,
            ratings,
        })
        if (!summary || summary.leaderboardMode !== matchingMode) {
            continue
        }
        return new Map((summary.leaderboard || []).map((row) => [row.name, row]))
    }
    return new Map()
}

function buildRankShiftLabel(rankDelta) {
    if (rankDelta === 0) {
        return "="
    }
    const magnitude = Math.abs(rankDelta)
    const label = magnitude === 1 ? "rank" : "ranks"
    return `${rankDelta > 0 ? "+" : "-"}${magnitude} ${label}`
}

function resolveRankTone(rankDelta, isActive) {
    if (rankDelta > 0) {
        return "up"
    }
    if (rankDelta < 0) {
        return "down"
    }
    return isActive ? "flat" : ""
}

function resolveLiveToneClasses(tone) {
    if (tone === "up") {
        return { deltaTone: "live-up", rankTone: "rank-up" }
    }
    if (tone === "down") {
        return { deltaTone: "live-down", rankTone: "rank-down" }
    }
    return { deltaTone: "live-flat", rankTone: "rank-flat" }
}

function resolveDeltaTone(ratingDelta) {
    if (ratingDelta > 0) {
        return "live-up"
    }
    if (ratingDelta < 0) {
        return "live-down"
    }
    return "live-flat"
}

function buildMovementState({ isActive, rankDelta, ratingDelta, showRatingDelta }) {
    const tone = resolveRankTone(rankDelta, isActive)
    const toneClasses = resolveLiveToneClasses(tone || "flat")
    return {
        tone,
        isActive,
        showRatingDelta,
        ratingDelta,
        deltaTone: resolveDeltaTone(ratingDelta),
        rankLabel: rankDelta !== 0 || isActive ? buildRankShiftLabel(rankDelta) : "",
        rankTone: toneClasses.rankTone,
    }
}

function getLiveRowState({ comparison, comparisonRank, index, isLiveParticipant, player, storyRow }) {
    if (storyRow) {
        return buildMovementState({
            isActive: storyRow.wasActiveInSession === true,
            rankDelta: storyRow.rankDelta || 0,
            ratingDelta: storyRow.ratingDelta || 0,
            showRatingDelta: storyRow.wasActiveInSession === true,
        })
    }

    if (!comparison) {
        return {
            tone: "",
            showRatingDelta: false,
            ratingDelta: 0,
            deltaTone: "delta",
            rankLabel: "",
            rankTone: "rank-shift",
        }
    }

    const ratingDelta = Math.round(player.rating - comparison.rating)
    const rankDelta = comparisonRank ? comparisonRank - (index + 1) : 0
    return buildMovementState({
        isActive: isLiveParticipant || rankDelta !== 0,
        rankDelta,
        ratingDelta,
        showRatingDelta: isLiveParticipant,
    })
}

export { buildLatestSessionStoryMap, collectLiveParticipantSet, getLiveRowState }
