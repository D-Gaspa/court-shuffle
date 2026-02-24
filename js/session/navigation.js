/**
 * Session round navigation — prev/next/end handlers.
 */

import { advanceTournament } from "../tournament/bracket.js"
import { attachTournamentCourtSchedule } from "../tournament/courts.js"
import {
    isSeriesTournamentSession,
    persistTournamentSeriesAliases,
    syncTournamentSeriesAliases,
} from "../tournament/series-sync.js"
import { allScoresEntered, getRoundScoreBlockReason } from "../tournament/utils.js"
import { endSession } from "./active.js"
import {
    onNextTournamentClick as onNextTournamentClickHandler,
    onPrevTournamentClick as onPrevTournamentClickHandler,
    onSkipTournamentClick as onSkipTournamentClickHandler,
} from "./tournament-series-navigation.js"

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
    if (session.mode === "tournament") {
        if (isSeriesTournamentSession(session)) {
            syncTournamentSeriesAliases(session)
        }
        if (!retreatTournamentView(session)) {
            return
        }
        if (isSeriesTournamentSession(session)) {
            persistTournamentSeriesAliases(session)
        }
        _saveState()
        _renderFn()
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
    if (shouldBlockPreGeneratedTournamentAdvance(session)) {
        return false
    }
    if (session.currentRound >= session.rounds.length - 1) {
        session.tournamentComplete = true
        return true
    }
    session.currentRound += 1
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

    if (session.mode === "tournament" && isCompletedTournamentFrontierView(session)) {
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

function isCompletedTournamentFrontierView(session) {
    if (!(session.mode === "tournament" && session.tournamentComplete)) {
        return false
    }
    const rounds = session.rounds || []
    if (rounds.length === 0) {
        return true
    }
    const currentRoundIndex = session.currentRound || 0
    if (currentRoundIndex < rounds.length - 1) {
        return false
    }
    return true
}

function onPrevTournamentClick() {
    onPrevTournamentClickHandler({
        state: _globalState,
        saveState: _saveState,
        renderFn: _renderFn,
    })
}

function onNextTournamentClick() {
    onNextTournamentClickHandler({
        state: _globalState,
        saveState: _saveState,
        renderFn: _renderFn,
        askConfirm: _askConfirm,
    })
}

function onSkipTournamentClick() {
    onSkipTournamentClickHandler({
        state: _globalState,
        saveState: _saveState,
        renderFn: _renderFn,
        askConfirm: _askConfirm,
    })
}

function advanceTournamentNavigation(session) {
    if (session.currentRound < session.rounds.length - 1) {
        session.currentRound += 1
        return true
    }

    const currentRound = session.rounds[session.currentRound]
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

function retreatTournamentView(session) {
    if ((session.currentRound || 0) > 0) {
        session.currentRound -= 1
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

export {
    initNavigation,
    onPrevRoundClick,
    onNextRoundClick,
    onPrevTournamentClick,
    onNextTournamentClick,
    onSkipTournamentClick,
    onEndSessionClick,
}
