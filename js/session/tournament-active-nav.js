import { advanceTournament } from "../tournament/bracket.js"
import { hasMultipleTournamentsInSeries, isSeriesTournamentSession } from "../tournament/series-sync.js"
import { getRoundScoreBlockReason } from "../tournament/utils.js"

function cloneSessionForAdvancePreview(session) {
    if (typeof structuredClone === "function") {
        return structuredClone(session)
    }
    return JSON.parse(JSON.stringify(session))
}

function wouldCompleteTournamentOnAdvance(session) {
    const previewSession = cloneSessionForAdvancePreview(session)
    return advanceTournament(previewSession) === null
}

function getTournamentSeriesProgress(session) {
    if (!(isSeriesTournamentSession(session) && hasMultipleTournamentsInSeries(session))) {
        return null
    }
    const series = session.tournamentSeries
    const tournamentCount = series.tournaments?.length || 0
    return {
        current: (series.currentTournamentIndex || 0) + 1,
        total: series.maxTournaments || (tournamentCount > 0 ? tournamentCount : 1),
        hasNext: (series.currentTournamentIndex || 0) < (tournamentCount > 0 ? tournamentCount : 1) - 1,
    }
}

function getTournamentBlockedLabel(round) {
    return getRoundScoreBlockReason(round) || "Enter all scores"
}

function updateTournamentCompleteUi(session, ui) {
    const progress = getTournamentSeriesProgress(session)
    ui.nextRoundBtn.disabled = true
    ui.nextRoundLabel.textContent = "Tournament Complete"
    ui.noMoreRounds.hidden = false
    const champion = session.teams.find((t) => t.id === session.bracket?.champion)
    const bannerEl = ui.noMoreRounds.querySelector("span") || ui.noMoreRounds
    const prefix = progress ? `Tournament ${progress.current} of ${progress.total} complete` : "Tournament complete"
    bannerEl.textContent = champion ? `${prefix}! Champion: ${champion.name}` : `${prefix}!`
}

function hasTournamentSeriesNavControls(ui) {
    return Boolean(ui.tournamentSeriesNav && ui.prevTournamentBtn && ui.nextTournamentBtn && ui.skipTournamentBtn)
}

function getCurrentSeriesRun(session) {
    const series = session.tournamentSeries
    return series?.tournaments?.[series.currentTournamentIndex || 0] || null
}

function getTournamentSeriesNavStatusText({ progress, isSkipped, isTournamentOver }) {
    let suffix = "Final tournament"
    if (isSkipped) {
        suffix = progress.hasNext ? "Skipped" : "Skipped (final)"
    } else if (isTournamentOver) {
        suffix = progress.hasNext ? "Complete, use Next Tournament" : "Complete"
    } else if (progress.hasNext) {
        suffix = "Skip to move on"
    }
    return `Viewing ${progress.current} of ${progress.total} · ${suffix}`
}

function updateTournamentSeriesNavUi(session, ui, isTournamentOver) {
    if (!hasTournamentSeriesNavControls(ui)) {
        return
    }

    const progress = getTournamentSeriesProgress(session)
    if (!progress) {
        ui.tournamentSeriesNav.hidden = true
        return
    }

    ui.tournamentSeriesNav.hidden = false
    const isSkipped = getCurrentSeriesRun(session)?.skipped === true
    ui.prevTournamentBtn.disabled = progress.current <= 1
    ui.nextTournamentBtn.disabled = !(progress.hasNext && (isTournamentOver || isSkipped))
    ui.skipTournamentBtn.disabled = !progress.hasNext || isTournamentOver || isSkipped

    if (ui.tournamentSeriesStatus) {
        ui.tournamentSeriesStatus.textContent = getTournamentSeriesNavStatusText({
            progress,
            isSkipped,
            isTournamentOver,
        })
    }
}

function updateFrontierTournamentNavigation({ session, navState, ui }) {
    const endsTournamentOnAdvance = navState.scoresComplete && wouldCompleteTournamentOnAdvance(session)
    ui.nextRoundBtn.disabled = !navState.scoresComplete
    if (navState.scoresComplete) {
        ui.nextRoundLabel.textContent = endsTournamentOnAdvance ? "End Tournament" : "Advance Round"
    } else {
        ui.nextRoundLabel.textContent = getTournamentBlockedLabel(session.rounds[navState.current])
    }
    ui.noMoreRounds.hidden = true
}

function updatePreGeneratedTournamentNavigation({ navState, ui, round }) {
    if (navState.isLast) {
        if (navState.scoresComplete) {
            ui.nextRoundBtn.disabled = false
            ui.nextRoundLabel.textContent = "End Tournament"
            ui.noMoreRounds.hidden = false
        } else {
            ui.nextRoundBtn.disabled = true
            ui.nextRoundLabel.textContent = getTournamentBlockedLabel(round)
            ui.noMoreRounds.hidden = true
        }
        return
    }

    ui.nextRoundBtn.disabled = !navState.scoresComplete
    ui.nextRoundLabel.textContent = navState.scoresComplete ? "Next Round" : getTournamentBlockedLabel(round)
    ui.noMoreRounds.hidden = true
}

function updateBracketTournamentNavigation({ session, navState, ui, isTournamentOver, isAtFrontier }) {
    if (isTournamentOver && isAtFrontier) {
        updateTournamentCompleteUi(session, ui)
        return
    }

    if (isAtFrontier) {
        updateFrontierTournamentNavigation({ session, navState, ui })
        return
    }

    ui.nextRoundBtn.disabled = false
    ui.nextRoundLabel.textContent = "Next Round"
    ui.noMoreRounds.hidden = true
}

function updateTournamentNavigation(session, navState, ui) {
    const isBracketTournament = !session.allRoundsGenerated
    const isAtFrontier = navState.current === session.rounds.length - 1
    const hasChampion = session.bracket?.champion !== null && session.bracket?.champion !== undefined
    const isTournamentOver = hasChampion || session.tournamentComplete === true
    ui.prevRoundBtn.disabled = !navState.canGoPrev
    updateTournamentSeriesNavUi(session, ui, isTournamentOver)

    if (isBracketTournament) {
        updateBracketTournamentNavigation({ session, navState, ui, isTournamentOver, isAtFrontier })
        return
    }

    updatePreGeneratedTournamentNavigation({ session, navState, ui, round: session.rounds[navState.current] })
}

function buildTournamentNavState(_session, roundInfo) {
    const scoreBlockReason = getRoundScoreBlockReason(roundInfo.round)
    const scoresComplete = scoreBlockReason === null
    const canGoPrev = roundInfo.current > 0

    return {
        current: roundInfo.current,
        isLast: roundInfo.isLast,
        scoresComplete,
        canGoPrev,
    }
}

export { buildTournamentNavState, updateTournamentNavigation }
