import { renderBracket, renderSitOuts } from "./session.js"
import { getModeLabel } from "./utils.js"

export function renderActiveSession(state, saveState, ui) {
    const session = state.activeSession
    if (!session) {
        return
    }

    const current = session.currentRound ?? session.rounds.length - 1
    const total = session.rounds.length
    const isLast = current >= total - 1
    const round = session.rounds[current]

    ui.roundNumber.textContent = current + 1
    ui.roundTotal.textContent = total

    const modeLabel = getModeLabel(session)
    const courts = (session.courtCount || 1) > 1 ? ` · ${session.courtCount} courts` : ""
    ui.roundInfo.textContent = `${session.players.length} players · ${modeLabel}${courts}`

    renderBracket(round, ui.bracketContainer, {
        editable: true,
        onCommit: (matchIndex, sets) => {
            if (!round.scores) {
                round.scores = round.matches.map(() => null)
            }
            if (sets) {
                round.scores[matchIndex] = {
                    court: round.matches[matchIndex].court,
                    sets,
                }
            } else {
                round.scores[matchIndex] = null
            }
            saveState()
        },
    })

    if (round.sitOuts && round.sitOuts.length > 0) {
        ui.sitOutContainer.hidden = false
        renderSitOuts(round.sitOuts, ui.sitOutList)
    } else {
        ui.sitOutContainer.hidden = true
    }

    ui.prevRoundBtn.disabled = current <= 0
    ui.nextRoundBtn.disabled = isLast
    ui.noMoreRounds.hidden = !isLast
}

export function endSession(state, saveState, save) {
    if (save) {
        const session = state.activeSession
        if (session) {
            state.history.push({
                id: session.id,
                date: session.date,
                players: session.players,
                teamCount: session.teamCount,
                mode: session.mode || "free",
                courtCount: session.courtCount || 1,
                rounds: session.rounds,
            })
        }
    }
    state.activeSession = null
    saveState()
}
