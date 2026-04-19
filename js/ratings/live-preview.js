function collectPlayerNames(liveLadder, committedLadder) {
    return new Set([...Object.keys(liveLadder?.players || {}), ...Object.keys(committedLadder?.players || {})])
}

function hasPlayerPresenceChanged(livePlayer, committedPlayer) {
    return Boolean((livePlayer && !committedPlayer) || (!livePlayer && committedPlayer))
}

function hasPlayerStatsChanged(livePlayer, committedPlayer) {
    if (!(livePlayer && committedPlayer)) {
        return false
    }
    return Boolean(
        Math.round(livePlayer.rating) !== Math.round(committedPlayer.rating) ||
            livePlayer.ratedMatchCount !== committedPlayer.ratedMatchCount ||
            livePlayer.wins !== committedPlayer.wins ||
            livePlayer.losses !== committedPlayer.losses,
    )
}

function hasLeaderboardChanged(liveLadder, committedLadder) {
    if ((liveLadder?.leaderboard || []).length !== (committedLadder?.leaderboard || []).length) {
        return true
    }
    return (liveLadder?.leaderboard || []).some((name, index) => committedLadder?.leaderboard?.[index] !== name)
}

function hasModePreviewChanges(liveLadder, committedLadder) {
    for (const name of collectPlayerNames(liveLadder, committedLadder)) {
        const livePlayer = liveLadder?.players?.[name] || null
        const committedPlayer = committedLadder?.players?.[name] || null
        if (hasPlayerPresenceChanged(livePlayer, committedPlayer)) {
            return true
        }
        if (hasPlayerStatsChanged(livePlayer, committedPlayer)) {
            return true
        }
    }
    return hasLeaderboardChanged(liveLadder, committedLadder)
}

function buildLivePreviewAvailability(committedRatingsModel, liveRatingsModel) {
    return {
        singles: hasModePreviewChanges(liveRatingsModel.ladders.singles, committedRatingsModel.ladders.singles),
        doubles: hasModePreviewChanges(liveRatingsModel.ladders.doubles, committedRatingsModel.ladders.doubles),
    }
}

export { buildLivePreviewAvailability }
