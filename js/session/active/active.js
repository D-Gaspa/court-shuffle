import { hasSavedScoreEntry } from "../../score-editor/sets.js"
import { getModeLabel } from "../../shared/utils.js"
import {
    getCurrentTournamentRun,
    hasMultipleTournamentsInSeries,
    isSeriesTournamentSession,
    persistTournamentSeriesAliases,
    syncTournamentSeriesAliases,
} from "../../tournament/series/sync.js"
import { renderBracket, renderSitOuts } from "./render.js"
import { renderTournamentActive } from "./tournament/active.js"
import { reconcileTournamentRoundsAfterScoreChange } from "./tournament/score-editing.js"

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
    const seriesLabel = hasMultipleTournamentsInSeries(session)
        ? ` · Tournament ${(session.tournamentSeries.currentTournamentIndex || 0) + 1} of ${session.tournamentSeries.maxTournaments}`
        : ""
    ui.roundInfo.textContent = `${session.players.length} players · ${modeLabel}${courts}${seriesLabel}`

    const roundInfo = { round, current, total, isLast }
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
        if (!hasSavedScoreEntry(score)) {
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

function buildTournamentSeriesHistory(series) {
    const historyRuns = series.tournaments
        .map((run) => ({
            ...run,
            rounds: buildTournamentHistoryRounds(run.rounds),
        }))
        .filter((run) => run.rounds.length > 0)

    return {
        ...series,
        tournaments: historyRuns,
    }
}

function buildPlayedSessionRounds(rounds) {
    if (!Array.isArray(rounds)) {
        return []
    }

    return rounds.filter(
        (round) => Array.isArray(round?.scores) && round.scores.some((score) => hasSavedScoreEntry(score)),
    )
}

function buildHistoryEntryForSession(session) {
    if (!session) {
        return null
    }

    const playedRounds = buildPlayedSessionRounds(session.rounds)
    const tournamentRounds =
        session.mode === "tournament" && !session.tournamentSeries ? buildTournamentHistoryRounds(session.rounds) : null
    const historyEntry = {
        id: session.id,
        date: session.date,
        players: session.players,
        teamCount: session.teamCount,
        mode: session.mode || "free",
        courtCount: session.courtCount || 1,
        rounds: tournamentRounds ?? playedRounds,
    }

    if (session.mode !== "tournament") {
        return historyEntry.rounds.length > 0 ? historyEntry : null
    }

    if (session.tournamentSeries) {
        const tournamentSeries = buildTournamentSeriesHistory(session.tournamentSeries)
        if (tournamentSeries.tournaments.length === 0) {
            return null
        }
        historyEntry.tournamentSeries = tournamentSeries
        historyEntry.tournamentFormat = session.tournamentSeries.format
        historyEntry.tournamentTeamSize = session.tournamentSeries.matchType === "singles" ? 1 : 2
        return historyEntry
    }

    if (historyEntry.rounds.length === 0) {
        return null
    }

    historyEntry.tournamentFormat = session.tournamentFormat
    historyEntry.tournamentTeamSize = session.tournamentTeamSize
    historyEntry.teams = session.teams
    historyEntry.bracket = session.bracket
    return historyEntry
}

function canSaveSessionToHistory(session) {
    return buildHistoryEntryForSession(session) !== null
}

function endSession(state, saveState, save) {
    const session = state.activeSession
    const historyEntry = save && session ? buildHistoryEntryForSession(session) : null
    if (historyEntry) {
        state.history.push(historyEntry)
    }
    state.activeSession = null
    saveState()
}

export { renderActiveSession, canSaveSessionToHistory, endSession }
