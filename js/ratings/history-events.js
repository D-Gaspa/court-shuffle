import { getHistoryTournamentPhases } from "../history/session-phases.js"
import { normalizeSets } from "../score-editor/sets.js"
import { determineMatchWinner } from "../tournament/utils.js"

function getCompleteSets(scoreEntry) {
    const sets = normalizeSets(scoreEntry)
    if (!Array.isArray(sets)) {
        return []
    }
    return sets.filter(
        (setScore) => Array.isArray(setScore) && Number.isFinite(setScore[0]) && Number.isFinite(setScore[1]),
    )
}

function getRatedMatchOutcome(round, matchIndex) {
    const scoreEntry = round?.scores?.[matchIndex]
    if (!scoreEntry) {
        return null
    }
    const sets = getCompleteSets(scoreEntry)
    if (sets.length === 0) {
        return null
    }
    const winnerIndex = determineMatchWinner({ ...scoreEntry, sets })
    if (!(winnerIndex === 0 || winnerIndex === 1)) {
        return null
    }
    return { winnerIndex }
}

function sanitizeTeams(rawTeams) {
    if (!Array.isArray(rawTeams) || rawTeams.length !== 2) {
        return null
    }
    const teams = rawTeams.map((team) => (Array.isArray(team) ? team.filter(Boolean) : []))
    if (teams.some((team) => team.length === 0)) {
        return null
    }
    return teams
}

function getPhaseTournamentRuns(phase) {
    if (!Array.isArray(phase?.tournamentSeries?.tournaments)) {
        return []
    }
    return phase.tournamentSeries.tournaments
}

function getMatchMode(tournamentTeamSize) {
    if (tournamentTeamSize === 1) {
        return "singles"
    }
    if (tournamentTeamSize === 2) {
        return "doubles"
    }
    return null
}

function createRatingEvent({ session, phaseIndex, tournamentIndex, roundIndex, matchIndex, teams, winnerIndex, mode }) {
    return {
        sessionId: session.id,
        sessionDate: session.date,
        phaseIndex,
        tournamentIndex,
        roundIndex,
        matchIndex,
        mode,
        teams,
        winnerIndex,
    }
}

function compareRatingEvents(a, b) {
    const dateDiff = Date.parse(a.sessionDate) - Date.parse(b.sessionDate)
    if (dateDiff !== 0) {
        return dateDiff
    }
    if (a.sessionId !== b.sessionId) {
        return a.sessionId.localeCompare(b.sessionId)
    }
    if (a.phaseIndex !== b.phaseIndex) {
        return a.phaseIndex - b.phaseIndex
    }
    if (a.tournamentIndex !== b.tournamentIndex) {
        return a.tournamentIndex - b.tournamentIndex
    }
    if (a.roundIndex !== b.roundIndex) {
        return a.roundIndex - b.roundIndex
    }
    return a.matchIndex - b.matchIndex
}

function isSessionWithinSeason(session, season) {
    const sessionDate = Date.parse(session.date || "")
    const seasonStart = Date.parse(season?.startedAt || "")
    const seasonEnd = season?.endedAt ? Date.parse(season.endedAt) : null
    if (!(Number.isFinite(sessionDate) && Number.isFinite(seasonStart))) {
        return false
    }
    if (sessionDate < seasonStart) {
        return false
    }
    return !(Number.isFinite(seasonEnd) && sessionDate > seasonEnd)
}

function collectRoundRatingEvents({ events, mode, phaseIndex, round, roundIndex, session, tournamentIndex }) {
    for (let matchIndex = 0; matchIndex < (round?.matches || []).length; matchIndex += 1) {
        const outcome = getRatedMatchOutcome(round, matchIndex)
        if (!outcome) {
            continue
        }
        const teams = sanitizeTeams(round.matches[matchIndex]?.teams)
        if (!teams) {
            continue
        }
        events.push(
            createRatingEvent({
                session,
                phaseIndex,
                tournamentIndex,
                roundIndex,
                matchIndex,
                teams,
                winnerIndex: outcome.winnerIndex,
                mode,
            }),
        )
    }
}

function collectTournamentRatingEvents({ events, phaseIndex, session, tournament, tournamentIndex }) {
    const mode = getMatchMode(tournament?.tournamentTeamSize)
    if (!mode) {
        return
    }
    for (let roundIndex = 0; roundIndex < (tournament?.rounds || []).length; roundIndex += 1) {
        collectRoundRatingEvents({
            events,
            mode,
            phaseIndex,
            round: tournament.rounds[roundIndex],
            roundIndex,
            session,
            tournamentIndex,
        })
    }
}

function collectPhaseRatingEvents({ events, phase, phaseIndex, session }) {
    const tournaments = getPhaseTournamentRuns(phase)
    for (let tournamentIndex = 0; tournamentIndex < tournaments.length; tournamentIndex += 1) {
        collectTournamentRatingEvents({
            events,
            phaseIndex,
            session,
            tournament: tournaments[tournamentIndex],
            tournamentIndex,
        })
    }
}

function collectSessionRatingEvents(session, season) {
    if (session?.mode !== "tournament" || !isSessionWithinSeason(session, season)) {
        return []
    }
    const events = []
    const phases = getHistoryTournamentPhases(session)
    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex += 1) {
        collectPhaseRatingEvents({ events, phase: phases[phaseIndex], phaseIndex, session })
    }
    return events
}

function collectRatingEvents(history, season) {
    const events = []
    for (const session of history || []) {
        events.push(...collectSessionRatingEvents(session, season))
    }
    events.sort(compareRatingEvents)
    return events
}

export { collectRatingEvents, compareRatingEvents }
