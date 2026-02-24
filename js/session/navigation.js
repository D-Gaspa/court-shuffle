/**
 * Session round navigation — prev/next/end handlers.
 */

import { advanceTournament } from "../tournament/bracket.js"
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
    if (!session || session.currentRound <= 0) {
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
        return false
    }
    session.currentRound += 1
    return true
}

function onNextRoundClick() {
    const session = _globalState.activeSession
    if (!session) {
        return
    }

    if (session.mode === "tournament" && session.tournamentComplete) {
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

    _saveState()
    _renderFn()
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
        _saveState()
        _renderFn()
        return false
    }

    session.tournamentComplete = false
    session.rounds.push(nextRound)
    session.currentRound = session.rounds.length - 1
    session.tournamentRound = (session.tournamentRound || 0) + 1
    return true
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
