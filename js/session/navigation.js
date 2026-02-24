/**
 * Session round navigation — prev/next/end handlers.
 */

import { advanceTournament } from "../tournament/bracket.js"
import { attachTournamentCourtSchedule, getBatchBlockReason } from "../tournament/courts.js"
import {
    isSeriesTournamentSession,
    moveToNextTournamentInSeries,
    moveToPrevTournamentInSeries,
    persistTournamentSeriesAliases,
    syncTournamentSeriesAliases,
} from "../tournament/series-sync.js"
import { allScoresEntered, getRoundScoreBlockReason } from "../tournament/utils.js"
import { endSession } from "./active.js"

let _globalState = null
let _saveState = null
let _askConfirm = null
let _renderFn = null
let _refreshFn = null

function initNavigation({ state, saveFn, confirmFn, renderFn, refreshFn }) {
    _globalState = state
    _saveState = saveFn
    _askConfirm = confirmFn
    _renderFn = renderFn
    _refreshFn = refreshFn
}

function onPrevRoundClick() {
    const session = _globalState.activeSession
    if (!session) {
        return
    }
    if (session.mode === "tournament" && isSeriesTournamentSession(session)) {
        syncTournamentSeriesAliases(session)
        if (retreatTournamentView(session)) {
            persistTournamentSeriesAliases(session)
            _saveState()
            _renderFn()
        }
        return
    }
    if (session.currentRound <= 0) {
        return
    }
    session.currentRound -= 1
    _saveState()
    _renderFn()
}

function shouldBlockPreGeneratedTournamentAdvance(session) {
    if (!(session.mode === "tournament" && session.allRoundsGenerated)) {
        return false
    }
    const currentRound = session.rounds[session.currentRound]
    return getRoundScoreBlockReason(currentRound) !== null
}

function advancePreGeneratedRound(session) {
    const currentRound = session.rounds[session.currentRound]
    const batchStep = advanceTournamentBatchNavigation(session, currentRound)
    if (batchStep === "blocked") {
        return false
    }
    if (batchStep === "advanced-batch") {
        return true
    }
    if (shouldBlockPreGeneratedTournamentAdvance(session)) {
        return false
    }
    if (session.currentRound >= session.rounds.length - 1) {
        session.tournamentComplete = true
        return true
    }
    session.currentRound += 1
    const nextRound = session.rounds[session.currentRound]
    if (nextRound?.courtSchedule?.mode === "batches") {
        nextRound.courtSchedule.activeBatchIndex = 0
    }
    return true
}

function onNextRoundClick() {
    const session = _globalState.activeSession
    if (!session) {
        return
    }

    if (session.mode === "tournament" && isSeriesTournamentSession(session)) {
        syncTournamentSeriesAliases(session)
    }

    if (session.mode === "tournament" && session.tournamentComplete) {
        if (isSeriesTournamentSession(session) && moveToNextTournamentInSeries(session)) {
            _saveState()
            _renderFn()
            return
        }
        onEndSessionClick()
        return
    }

    if (session.mode === "tournament" && !session.allRoundsGenerated) {
        if (!advanceTournamentNavigation(session)) {
            return
        }
    } else if (!advancePreGeneratedRound(session)) {
        return
    }

    if (session.mode === "tournament" && isSeriesTournamentSession(session)) {
        persistTournamentSeriesAliases(session)
    }
    _saveState()
    _renderFn()
}

function advanceTournamentNavigation(session) {
    if (session.currentRound < session.rounds.length - 1) {
        const currentRound = session.rounds[session.currentRound]
        const batchStep = advanceTournamentBatchNavigation(session, currentRound)
        if (batchStep === "blocked") {
            return false
        }
        if (batchStep === "advanced-batch") {
            return true
        }
        session.currentRound += 1
        const nextRound = session.rounds[session.currentRound]
        if (nextRound?.courtSchedule?.mode === "batches") {
            nextRound.courtSchedule.activeBatchIndex = 0
        }
        return true
    }

    const currentRound = session.rounds[session.currentRound]
    const batchStep = advanceTournamentBatchNavigation(session, currentRound)
    if (batchStep === "blocked") {
        return false
    }
    if (batchStep === "advanced-batch") {
        return true
    }
    if (!allScoresEntered(currentRound)) {
        return false
    }

    const nextRound = advanceTournament(session)
    if (nextRound === null) {
        session.tournamentComplete = true
        return true
    }

    session.tournamentComplete = false
    attachTournamentCourtSchedule(
        nextRound,
        session.courtCount || 1,
        session.tournamentSeries?.courtHandling || "queue",
    )
    session.rounds.push(nextRound)
    session.currentRound = session.rounds.length - 1
    session.tournamentRound = (session.tournamentRound || 0) + 1
    return true
}

function advanceTournamentBatchNavigation(_session, round) {
    if (!(round?.courtSchedule?.mode === "batches")) {
        return "ready"
    }
    const blockReason = getBatchBlockReason(round, getRoundScoreBlockReason)
    if (blockReason !== null) {
        return "blocked"
    }
    const batches = round.courtSchedule.batches || []
    const idx = round.courtSchedule.activeBatchIndex || 0
    if (idx < batches.length - 1) {
        round.courtSchedule.activeBatchIndex = idx + 1
        return "advanced-batch"
    }
    return "ready"
}

function retreatTournamentView(session) {
    const currentRound = session.rounds?.[session.currentRound]
    if (currentRound?.courtSchedule?.mode === "batches" && (currentRound.courtSchedule.activeBatchIndex || 0) > 0) {
        currentRound.courtSchedule.activeBatchIndex -= 1
        return true
    }

    if ((session.currentRound || 0) > 0) {
        session.currentRound -= 1
        const prevRound = session.rounds[session.currentRound]
        if (prevRound?.courtSchedule?.mode === "batches") {
            const lastBatch = (prevRound.courtSchedule.batches?.length || 1) - 1
            prevRound.courtSchedule.activeBatchIndex = Math.max(0, lastBatch)
        }
        return true
    }

    if (moveToPrevTournamentInSeries(session)) {
        session.tournamentComplete = false
        session.currentRound = session.rounds.length - 1
        const lastRound = session.rounds[session.currentRound]
        if (lastRound?.courtSchedule?.mode === "batches") {
            const lastBatch = (lastRound.courtSchedule.batches?.length || 1) - 1
            lastRound.courtSchedule.activeBatchIndex = Math.max(0, lastBatch)
        }
        return true
    }

    return false
}

function onEndSessionClick() {
    const opts = {
        okLabel: "Save & End",
        okClass: "btn-primary",
        extraLabel: "Discard",
        onExtra: () => {
            endSession(_globalState, _saveState, false)
            _refreshFn()
        },
    }
    _askConfirm(
        "End Session",
        "Save this session to history, or discard it?",
        () => {
            endSession(_globalState, _saveState, true)
            _refreshFn()
        },
        opts,
    )
}

export { initNavigation, onPrevRoundClick, onNextRoundClick, onEndSessionClick }
