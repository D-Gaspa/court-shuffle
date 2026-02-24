import { getModeLabel } from "../utils.js"
import { renderBracket, renderSitOuts } from "./render.js"
import { renderTournamentActive } from "./tournament-active.js"

function renderActiveSession(state, saveState, ui) {
    const session = state.activeSession
    if (!session) {
        return
    }

    let current = session.currentRound ?? session.rounds.length - 1
    const total = session.rounds.length
    const isLast = current >= total - 1
    const round = session.rounds[current]

    const modeLabel = getModeLabel(session)
    let courts = ""
    if (session.mode === "tournament") {
        current = session.currentRound ?? session.rounds.length - 1
        const matchCount = session.rounds[current]?.matches?.length || 0
        if (matchCount > 1) {
            courts = ` · ${matchCount} matches this round`
        }
    } else if ((session.courtCount || 1) > 1) {
        courts = ` · ${session.courtCount} courts`
    }
    ui.roundInfo.textContent = `${session.players.length} players · ${modeLabel}${courts}`

    if (ui.modifyPlayersBtn) {
        ui.modifyPlayersBtn.hidden = session.mode === "tournament"
    }

    const roundInfo = { round, current, total, isLast }
    if (session.mode === "tournament") {
        renderTournamentActive({ session, roundInfo, saveState, ui, commitScore, renderSitOutsSection })
    } else {
        renderStandardActive(roundInfo, saveState, ui)
    }
}

function renderStandardActive(roundInfo, saveState, ui) {
    if (ui.roundPrefix) {
        ui.roundPrefix.hidden = false
    }
    ui.roundNumber.textContent = roundInfo.current + 1
    ui.roundTotal.textContent = roundInfo.total

    renderBracket(roundInfo.round, ui.bracketContainer, {
        editable: true,
        onCommit: (matchIndex, sets) => {
            commitScore({ round: roundInfo.round, matchIndex, sets, saveState })
        },
    })

    renderSitOutsSection(roundInfo.round, ui)

    ui.prevRoundBtn.disabled = roundInfo.current <= 0
    ui.nextRoundBtn.disabled = roundInfo.isLast
    ui.nextRoundLabel.textContent = "Next Round"
    ui.noMoreRounds.hidden = !roundInfo.isLast
}

function commitScore({ round, matchIndex, sets, saveState, onAfterSave }) {
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
    onAfterSave?.()
}

function renderSitOutsSection(round, ui) {
    if (round.sitOuts && round.sitOuts.length > 0) {
        ui.sitOutContainer.hidden = false
        renderSitOuts(round.sitOuts, ui.sitOutList)
    } else {
        ui.sitOutContainer.hidden = true
    }
}

function hasSavedMatchScore(entry) {
    if (!entry) {
        return false
    }
    if (Array.isArray(entry.sets) && entry.sets.length > 0) {
        return true
    }
    return Array.isArray(entry.score) && entry.score.length === 2
}

function cloneMatchForHistory(match) {
    return {
        ...match,
        teams: Array.isArray(match.teams) ? match.teams.map((team) => [...team]) : match.teams,
        teamIds: Array.isArray(match.teamIds) ? [...match.teamIds] : match.teamIds,
    }
}

function cloneScoreForHistory(score) {
    if (!score) {
        return null
    }
    const next = { ...score }
    if (Array.isArray(score.sets)) {
        next.sets = score.sets.map((setScore) => {
            const clone = [setScore[0], setScore[1]]
            if (setScore[2]?.tb) {
                clone.push({ tb: [...setScore[2].tb] })
            }
            return clone
        })
    }
    if (Array.isArray(score.score)) {
        next.score = [...score.score]
    }
    return next
}

function cloneTournamentRoundForHistory(round, matches, scores) {
    return {
        ...round,
        matches,
        scores,
        sitOuts: Array.isArray(round.sitOuts) ? [...round.sitOuts] : round.sitOuts,
        byes: Array.isArray(round.byes) ? [...round.byes] : round.byes,
        losersByes: Array.isArray(round.losersByes) ? [...round.losersByes] : round.losersByes,
    }
}

function collectPlayedRoundMatches(round) {
    if (!(Array.isArray(round.matches) && Array.isArray(round.scores))) {
        return null
    }

    const matches = []
    const scores = []
    for (let i = 0; i < round.matches.length; i += 1) {
        const score = round.scores[i]
        if (!hasSavedMatchScore(score)) {
            continue
        }
        matches.push(cloneMatchForHistory(round.matches[i]))
        scores.push(cloneScoreForHistory(score))
    }

    if (matches.length === 0) {
        return null
    }
    return { matches, scores }
}

function buildTournamentHistoryRounds(rounds) {
    const savedRounds = []

    for (const round of rounds) {
        const played = collectPlayedRoundMatches(round)
        if (!played) {
            continue
        }
        savedRounds.push(cloneTournamentRoundForHistory(round, played.matches, played.scores))
    }

    return savedRounds
}

function endSession(state, saveState, save) {
    if (save) {
        const session = state.activeSession
        if (session) {
            const playedRounds = session.rounds.filter((round) => round.scores?.some((s) => s !== null) ?? false)
            const historyEntry = {
                id: session.id,
                date: session.date,
                players: session.players,
                teamCount: session.teamCount,
                mode: session.mode || "free",
                courtCount: session.courtCount || 1,
                rounds: session.mode === "tournament" ? buildTournamentHistoryRounds(session.rounds) : playedRounds,
            }
            if (session.mode === "tournament") {
                historyEntry.tournamentFormat = session.tournamentFormat
                historyEntry.tournamentTeamSize = session.tournamentTeamSize
                historyEntry.teams = session.teams
                historyEntry.bracket = session.bracket
            }
            state.history.push(historyEntry)
        }
    }
    state.activeSession = null
    saveState()
}

export { renderActiveSession, endSession }
