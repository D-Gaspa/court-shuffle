import {
    getCurrentTournamentRun,
    isSeriesTournamentSession,
    moveToNextTournamentInSeries,
    moveToPrevTournamentInSeries,
    syncTournamentSeriesAliases,
} from "../../tournament/series/sync.js"

function getSeriesTournamentProgress(session) {
    const series = session?.tournamentSeries
    if (!series) {
        return null
    }
    const total =
        Array.isArray(series.tournaments) && series.tournaments.length > 0
            ? series.tournaments.length
            : (series.maxTournaments ?? 0)
    const currentIndex = series.currentTournamentIndex || 0
    return {
        currentIndex,
        current: currentIndex + 1,
        total,
        hasNext: currentIndex < total - 1,
    }
}

function hasAnyPlayedScores(rounds) {
    if (!Array.isArray(rounds)) {
        return false
    }
    return rounds.some(
        (round) =>
            Array.isArray(round?.scores) &&
            round.scores.some(
                (score) => Boolean(score) && ((score.sets?.length ?? 0) > 0 || (score.score?.length ?? 0) > 0),
            ),
    )
}

function moveSeriesTournament(session, direction, { saveState, renderFn }) {
    if (!isSeriesTournamentSession(session)) {
        return false
    }
    syncTournamentSeriesAliases(session)
    const moved = direction === "prev" ? moveToPrevTournamentInSeries(session) : moveToNextTournamentInSeries(session)
    if (!moved) {
        return false
    }
    saveState()
    renderFn()
    return true
}

function skipCurrentTournament(session, deps) {
    const run = getCurrentTournamentRun(session)
    if (run) {
        run.skipped = true
    }
    return moveSeriesTournament(session, "next", deps)
}

function onPrevTournamentClick(deps) {
    const session = deps.state.activeSession
    if (!(session && isSeriesTournamentSession(session))) {
        return
    }
    moveSeriesTournament(session, "prev", deps)
}

function onNextTournamentClick(deps) {
    const session = deps.state.activeSession
    if (!(session && isSeriesTournamentSession(session))) {
        return
    }
    syncTournamentSeriesAliases(session)

    const progress = getSeriesTournamentProgress(session)
    if (!progress?.hasNext) {
        return
    }

    if (session.tournamentComplete) {
        moveSeriesTournament(session, "next", deps)
        return
    }

    const run = getCurrentTournamentRun(session)
    if (run?.skipped) {
        moveSeriesTournament(session, "next", deps)
        return
    }
    const played = hasAnyPlayedScores(run?.rounds || session.rounds)
    const currentLabel = `Tournament ${progress.current} of ${progress.total}`
    const message = played
        ? `${currentLabel} is not complete. Move to the next mini tournament and keep current progress in this one?`
        : `${currentLabel} is not complete. Skip it and move to the next mini tournament?`

    deps.askConfirm("Skip Mini Tournament?", message, () => {
        skipCurrentTournament(session, deps)
    })
}

function onSkipTournamentClick(deps) {
    const session = deps.state.activeSession
    if (!(session && isSeriesTournamentSession(session))) {
        return
    }
    syncTournamentSeriesAliases(session)
    const progress = getSeriesTournamentProgress(session)
    if (!progress?.hasNext) {
        return
    }
    const currentLabel = `Tournament ${progress.current} of ${progress.total}`
    deps.askConfirm("Skip Mini Tournament?", `Skip ${currentLabel} and move to the next mini tournament?`, () => {
        skipCurrentTournament(session, deps)
    })
}

export { onPrevTournamentClick, onNextTournamentClick, onSkipTournamentClick }
