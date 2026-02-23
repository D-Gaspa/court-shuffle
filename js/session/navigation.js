/**
 * Session round navigation — prev/next/end handlers.
 */

import { advanceTournament } from "../tournament/bracket.js"
import { allScoresEntered } from "../tournament/utils.js"
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

function onNextRoundClick() {
    const session = _globalState.activeSession
    if (!session) {
        return
    }

    // Tournament with score-driven advancement
    if (session.mode === "tournament" && !session.allRoundsGenerated) {
        if (session.currentRound < session.rounds.length - 1) {
            // Navigating to an already-generated round
            session.currentRound += 1
        } else {
            // At the latest round — try to advance
            const currentRound = session.rounds[session.currentRound]
            if (!allScoresEntered(currentRound)) {
                return // UI should show a hint
            }
            const nextRound = advanceTournament(session)
            if (nextRound === null) {
                // Tournament complete
                return
            }
            session.rounds.push(nextRound)
            session.currentRound = session.rounds.length - 1
            session.tournamentRound = (session.tournamentRound || 0) + 1
        }
    } else {
        // Normal pre-generated round navigation
        if (session.currentRound >= session.rounds.length - 1) {
            return
        }
        session.currentRound += 1
    }

    _saveState()
    _renderFn()
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
