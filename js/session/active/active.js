import { getModeLabel } from "../../shared/utils.js"
import {
    getCurrentTournamentRun,
    hasMultipleTournamentsInSeries,
    isSeriesTournamentSession,
    persistTournamentSeriesAliases,
    syncTournamentSeriesAliases,
} from "../../tournament/series/sync.js"
import { canContinueTournamentSession } from "../continuation/eligibility.js"
import { renderBracket, renderSitOuts } from "./render.js"
import { renderTournamentActive } from "./tournament/active.js"
import { reconcileTournamentRoundsAfterScoreChange } from "./tournament/score-editing.js"

function resolveRenderableRoundInfo(session) {
    const rounds = Array.isArray(session?.rounds) ? session.rounds : []
    if (rounds.length === 0) {
        return null
    }

    const fallbackRoundIndex = Math.max(0, rounds.length - 1)
    const requestedRoundIndex = Number.isInteger(session.currentRound) ? session.currentRound : fallbackRoundIndex
    const current = Math.min(Math.max(requestedRoundIndex, 0), rounds.length - 1)
    if (session.currentRound !== current) {
        session.currentRound = current
    }

    return {
        round: rounds[current],
        current,
        total: rounds.length,
        isLast: current >= rounds.length - 1,
    }
}

function renderUnavailableSessionState(session, ui) {
    ui.roundInfo.textContent = `${session.players.length} players · ${getModeLabel(session)}`
    if (ui.continueSessionBtn) {
        ui.continueSessionBtn.hidden = true
        ui.continueSessionBtn.disabled = true
    }
    if (ui.roundPrefix) {
        ui.roundPrefix.hidden = false
    }
    ui.roundNumber.textContent = "—"
    ui.roundTotal.textContent = 0
    ui.bracketContainer.textContent = "Session data is unavailable."
    ui.sitOutList.textContent = ""
    ui.sitOutContainer.hidden = true
    ui.prevRoundBtn.disabled = true
    ui.nextRoundBtn.disabled = true
    ui.nextRoundLabel.textContent = "Next Round"
    ui.noMoreRounds.hidden = true
}

function renderSessionRoundView({ session, roundInfo, saveState, ui, commitScoreForSession }) {
    if (session.mode === "tournament") {
        renderTournamentActive({
            session,
            roundInfo,
            saveState,
            ui,
            commitScore: commitScoreForSession,
            renderSitOutsSection,
        })
        return
    }
    renderStandardActive(roundInfo, saveState, ui, commitScoreForSession)
}

function renderActiveSession(state, saveState, ui) {
    const session = state.activeSession
    if (!session) {
        return
    }

    if (isSeriesTournamentSession(session)) {
        syncTournamentSeriesAliases(session)
    }

    const roundInfo = resolveRenderableRoundInfo(session)
    if (!roundInfo) {
        renderUnavailableSessionState(session, ui)
        if (ui.tournamentSeriesNav) {
            ui.tournamentSeriesNav.hidden = true
        }
        return
    }

    const modeLabel = getModeLabel(session)
    let courts = ""
    if (session.mode === "tournament") {
        const matchCount = session.rounds[roundInfo.current]?.matches?.length || 0
        if (matchCount > 1) {
            courts = ` · ${matchCount} matches this round`
        }
    } else if ((session.courtCount || 1) > 1) {
        courts = ` · ${session.courtCount} courts`
    }
    const seriesLabel = hasMultipleTournamentsInSeries(session)
        ? ` · Tournament ${(session.tournamentSeries.currentTournamentIndex || 0) + 1} of ${session.tournamentSeries.maxTournaments}`
        : ""
    ui.roundInfo.textContent = `${session.players.length} players · ${modeLabel}${courts}${seriesLabel}`
    if (ui.continueSessionBtn) {
        const canContinue = canContinueTournamentSession(session)
        ui.continueSessionBtn.textContent = "Change Roster"
        ui.continueSessionBtn.hidden = !canContinue
        ui.continueSessionBtn.disabled = !canContinue
    }

    if (ui.tournamentSeriesNav) {
        ui.tournamentSeriesNav.hidden = true
    }
    const commitScoreForSession = (args) => {
        commitScore({ ...args, session })
    }
    renderSessionRoundView({ session, roundInfo, saveState, ui, commitScoreForSession })
}

function renderStandardActive(roundInfo, saveState, ui, commitScoreForSession) {
    if (ui.roundPrefix) {
        ui.roundPrefix.hidden = false
    }
    ui.roundNumber.textContent = roundInfo.current + 1
    ui.roundTotal.textContent = roundInfo.total

    renderBracket(roundInfo.round, ui.bracketContainer, {
        editable: true,
        onCommit: (matchIndex, sets) => {
            commitScoreForSession({ round: roundInfo.round, matchIndex, sets, saveState })
        },
    })

    renderSitOutsSection(roundInfo.round, ui)

    ui.prevRoundBtn.disabled = roundInfo.current <= 0
    ui.nextRoundBtn.disabled = roundInfo.isLast
    ui.nextRoundLabel.textContent = "Next Round"
    ui.noMoreRounds.hidden = !roundInfo.isLast
}

function commitScore({ round, matchIndex, sets, saveState, onAfterSave, session, options }) {
    if (!round.scores) {
        round.scores = round.matches.map(() => null)
    }
    if (sets) {
        round.scores[matchIndex] = {
            court: round.matches[matchIndex].court,
            sets,
        }
        if (isSeriesTournamentSession(session)) {
            const run = getCurrentTournamentRun(session)
            if (run?.skipped) {
                run.skipped = false
            }
        }
    } else {
        round.scores[matchIndex] = null
    }
    if (session.mode === "tournament") {
        const roundIndex = session.rounds.indexOf(round)
        if (roundIndex !== -1) {
            reconcileTournamentRoundsAfterScoreChange(session, roundIndex)
        }
        if (isSeriesTournamentSession(session)) {
            persistTournamentSeriesAliases(session)
        }
    }
    saveState()
    onAfterSave?.(options)
}

function renderSitOutsSection(round, ui) {
    if (round.sitOuts && round.sitOuts.length > 0) {
        ui.sitOutContainer.hidden = false
        renderSitOuts(round.sitOuts, ui.sitOutList)
    } else {
        ui.sitOutList.textContent = ""
        ui.sitOutContainer.hidden = true
    }
}

export { renderActiveSession, resolveRenderableRoundInfo }
