import { extractPairs, matchupKey } from "../shuffle/core.js"
import { generateOptimalRoundSequence, wrapFreeRounds } from "../shuffle/free.js"
import { generateStructuredRounds } from "../shuffle/structured.js"
import { renderPlayerSelection } from "./render.js"

const modifyDialog = document.getElementById("modify-players-dialog")
const modifyGrid = document.getElementById("modify-players-grid")
const modifyCancelBtn = document.getElementById("modify-cancel")
const modifyApplyBtn = document.getElementById("modify-apply")

let modifySelected = new Set()
let stateRef = null
let saveFn = null
let renderFn = null

function initModifyPlayers(state, persistFn, onApply) {
    stateRef = state
    saveFn = persistFn
    renderFn = onApply
    modifyCancelBtn.addEventListener("click", () => modifyDialog.close())
    modifyApplyBtn.addEventListener("click", applyModifyPlayers)
}

function openModifyDialog() {
    const session = stateRef.activeSession
    if (!session) {
        return
    }
    // Cannot modify players in tournament mode (would break bracket)
    if (session.mode === "tournament") {
        return
    }
    modifySelected = new Set(session.players)
    renderPlayerSelection(stateRef.roster, modifySelected, modifyGrid, noop)
    modifyDialog.showModal()
}

function noop() {
    /* intentional no-op for renderPlayerSelection onChange */
}

function collectUsedHistory(session) {
    const played = session.rounds.slice(0, session.currentRound + 1)
    if (session.mode === "free") {
        const pairs = new Set()
        for (const round of played) {
            for (const match of round.matches) {
                for (const p of extractPairs(match.teams)) {
                    pairs.add(p)
                }
            }
        }
        return pairs
    }
    const matchups = new Set()
    for (const round of played) {
        for (const match of round.matches) {
            matchups.add(matchupKey(match.teams, session.mode))
        }
    }
    return matchups
}

function applyModifyPlayers() {
    const session = stateRef.activeSession
    if (!session) {
        return
    }
    const newPlayers = [...modifySelected]
    if (newPlayers.length < 2) {
        return
    }

    const kept = session.rounds.slice(0, session.currentRound + 1)
    const usedHistory = collectUsedHistory(session)
    let newRounds

    if (session.mode === "free") {
        const raw = generateOptimalRoundSequence(newPlayers, session.teamCount, usedHistory)
        newRounds = wrapFreeRounds(raw)
    } else {
        newRounds = generateStructuredRounds(
            newPlayers,
            session.mode,
            session.courtCount,
            usedHistory,
            session.allowNotStrictDoubles,
        )
    }

    session.players = newPlayers
    session.rounds = [...kept, ...newRounds]
    saveFn()
    modifyDialog.close()
    renderFn()
}

export { initModifyPlayers, openModifyDialog }
