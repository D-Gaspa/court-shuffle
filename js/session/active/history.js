import { buildHistoryRemixPayload } from "../../history/remix.js"
import { hasSavedScoreEntry } from "../../score-editor/sets.js"

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
        .map((run, index) => ({
            ...run,
            currentRound: Math.min(run.currentRound ?? 0, Math.max(0, run.rounds.length - 1)),
            index,
        }))

    const currentTournamentIndex = Math.min(series.currentTournamentIndex ?? 0, Math.max(0, historyRuns.length - 1))

    return {
        ...series,
        currentTournamentIndex,
        tournaments: historyRuns,
    }
}

function cloneContinuationForHistory(continuation) {
    if (!continuation) {
        return null
    }

    return {
        sourcePhaseIndex: continuation.sourcePhaseIndex ?? null,
        sourceTournamentIndex: continuation.sourceTournamentIndex ?? null,
        inheritedPhaseIndexes: Array.isArray(continuation.inheritedPhaseIndexes)
            ? [...continuation.inheritedPhaseIndexes]
            : [],
        addedPlayers: Array.isArray(continuation.addedPlayers) ? [...continuation.addedPlayers] : [],
        removedPlayers: Array.isArray(continuation.removedPlayers) ? [...continuation.removedPlayers] : [],
        abandonedFutureTournamentIndexes: Array.isArray(continuation.abandonedFutureTournamentIndexes)
            ? [...continuation.abandonedFutureTournamentIndexes]
            : [],
        createdAt: continuation.createdAt || null,
        inheritedConfig: continuation.inheritedConfig ? { ...continuation.inheritedConfig } : null,
        editedConfig: continuation.editedConfig ? { ...continuation.editedConfig } : null,
    }
}

function buildTournamentHistoryPhase(phase) {
    const tournamentSeries = buildTournamentSeriesHistory(phase?.tournamentSeries)
    if (tournamentSeries.tournaments.length === 0) {
        return null
    }

    return {
        id: phase.id,
        createdAt: phase.createdAt,
        players: Array.isArray(phase.players) ? [...phase.players] : [],
        courtCount: phase.courtCount || tournamentSeries.courtCount || 1,
        allowNotStrictDoubles: Boolean(phase.allowNotStrictDoubles),
        tournamentConfig: phase.tournamentConfig ? { ...phase.tournamentConfig } : null,
        tournamentSeries,
        continuation: cloneContinuationForHistory(phase.continuation),
    }
}

function buildTournamentHistoryPhases(session) {
    if (!Array.isArray(session?.phases)) {
        return []
    }

    return session.phases.map(buildTournamentHistoryPhase).filter(Boolean)
}

function buildPlayedSessionRounds(rounds) {
    if (!Array.isArray(rounds)) {
        return []
    }

    return rounds.filter(
        (round) => Array.isArray(round?.scores) && round.scores.some((score) => hasSavedScoreEntry(score)),
    )
}

function buildBaseHistoryEntry(session) {
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
    const remix = buildHistoryRemixPayload(session)
    if (remix) {
        historyEntry.remix = remix
    }
    return historyEntry
}

function buildTournamentHistoryEntry(session, historyEntry) {
    const phases = buildTournamentHistoryPhases(session)
    if (phases.length > 0) {
        const currentPhase = phases.at(-1)
        historyEntry.currentPhaseIndex = phases.length - 1
        historyEntry.phases = phases
        historyEntry.players = currentPhase.players
        historyEntry.courtCount = currentPhase.courtCount
        historyEntry.allowNotStrictDoubles = currentPhase.allowNotStrictDoubles
        historyEntry.tournamentConfig = currentPhase.tournamentConfig
        historyEntry.tournamentSeries = currentPhase.tournamentSeries
        historyEntry.tournamentFormat = currentPhase.tournamentSeries.format
        historyEntry.tournamentTeamSize = currentPhase.tournamentSeries.matchType === "singles" ? 1 : 2
        return historyEntry
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

function buildHistoryEntryForSession(session) {
    if (!session) {
        return null
    }

    const historyEntry = buildBaseHistoryEntry(session)
    if (session.mode !== "tournament") {
        return historyEntry.rounds.length > 0 ? historyEntry : null
    }

    return buildTournamentHistoryEntry(session, historyEntry)
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

export { buildHistoryEntryForSession, canSaveSessionToHistory, endSession }
