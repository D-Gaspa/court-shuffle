import { advanceTournament } from "../tournament/bracket.js"
import { getBatchBlockReason } from "../tournament/courts.js"
import { isSeriesTournamentSession } from "../tournament/series-sync.js"
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
    if (!isSeriesTournamentSession(session)) {
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

function getTournamentBlockedLabel(round, options = {}) {
    if (options.batchOnly) {
        return getBatchBlockReason(round, getRoundScoreBlockReason) || "Enter all scores"
    }
    return getRoundScoreBlockReason(round) || "Enter all scores"
}

function updateTournamentCompleteUi(session, ui) {
    const progress = getTournamentSeriesProgress(session)
    ui.nextRoundBtn.disabled = false
    ui.nextRoundLabel.textContent = progress?.hasNext ? "Next Tournament" : "End Session"
    ui.noMoreRounds.hidden = false
    const champion = session.teams.find((t) => t.id === session.bracket?.champion)
    const bannerEl = ui.noMoreRounds.querySelector("span") || ui.noMoreRounds
    const prefix = progress ? `Tournament ${progress.current} of ${progress.total} complete` : "Tournament complete"
    bannerEl.textContent = champion ? `${prefix}! Champion: ${champion.name}` : `${prefix}!`
}

function updateFrontierTournamentNavigation({ session, navState, ui }) {
    if (navState.hasMoreBatches) {
        ui.nextRoundBtn.disabled = !navState.batchScoresComplete
        ui.nextRoundLabel.textContent = navState.batchScoresComplete
            ? "Next Batch"
            : getTournamentBlockedLabel(session.rounds[navState.current], { batchOnly: true })
        ui.noMoreRounds.hidden = true
        return
    }

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
    if (navState.hasMoreBatches) {
        ui.nextRoundBtn.disabled = !navState.batchScoresComplete
        ui.nextRoundLabel.textContent = navState.batchScoresComplete
            ? "Next Batch"
            : getTournamentBlockedLabel(round, { batchOnly: true })
        ui.noMoreRounds.hidden = true
        return
    }

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
    if (isTournamentOver) {
        updateTournamentCompleteUi(session, ui)
        return
    }

    if (isAtFrontier) {
        updateFrontierTournamentNavigation({ session, navState, ui })
        return
    }

    ui.nextRoundBtn.disabled = false
    ui.nextRoundLabel.textContent = navState.hasMoreBatches ? "Next Batch" : "Next Round"
    ui.noMoreRounds.hidden = true
}

function updateTournamentNavigation(session, navState, ui) {
    const isBracketTournament = !session.allRoundsGenerated
    const isAtFrontier = navState.current === session.rounds.length - 1
    const hasChampion = session.bracket?.champion !== null && session.bracket?.champion !== undefined
    const isTournamentOver = hasChampion || session.tournamentComplete === true
    ui.prevRoundBtn.disabled = !navState.canGoPrev

    if (isBracketTournament) {
        updateBracketTournamentNavigation({ session, navState, ui, isTournamentOver, isAtFrontier })
        return
    }

    updatePreGeneratedTournamentNavigation({ session, navState, ui, round: session.rounds[navState.current] })
}

function buildTournamentNavState(session, roundInfo) {
    const scoreBlockReason = getRoundScoreBlockReason(roundInfo.round)
    const scoresComplete = scoreBlockReason === null
    const batchScoresComplete = getBatchBlockReason(roundInfo.round, getRoundScoreBlockReason) === null
    const batchCount = roundInfo.round.courtSchedule?.batches?.length || 1
    const batchIndex = roundInfo.round.courtSchedule?.activeBatchIndex || 0
    const hasMoreBatches = roundInfo.round.courtSchedule?.mode === "batches" && batchIndex < batchCount - 1
    const series = session.tournamentSeries
    const canGoPrev =
        roundInfo.current > 0 ||
        (roundInfo.round.courtSchedule?.mode === "batches" && batchIndex > 0) ||
        (isSeriesTournamentSession(session) && (series.currentTournamentIndex || 0) > 0)

    return {
        current: roundInfo.current,
        isLast: roundInfo.isLast,
        scoresComplete,
        batchScoresComplete,
        hasMoreBatches,
        canGoPrev,
    }
}

export { buildTournamentNavState, updateTournamentNavigation }
