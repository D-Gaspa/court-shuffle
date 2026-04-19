const PERCENT_SCALE = 100
const SINGLE_DECIMAL_PLACES = 1

function buildSessionInsights(sessions) {
    const counters = createSessionCounterState()
    for (const session of sessions) {
        registerSessionBasics(session, counters)
        accumulateSitOuts(session, counters.sitOuts)
    }
    return finalizeSessionInsights(sessions, counters)
}

function createSessionCounterState() {
    return {
        attendance: new Map(),
        sitOuts: new Map(),
        tournamentFormats: new Map(),
        courtCounts: new Map(),
        tournamentSessions: 0,
        totalCourts: 0,
        largestSession: null,
    }
}

function registerSessionBasics(session, counters) {
    const uniquePlayers = [...new Set(session.players || [])]
    incrementAttendance(uniquePlayers, counters.attendance)
    updateLargestSession(uniquePlayers.length, session.date, counters)
    registerCourtCount(session.courtCount || 1, counters)
    registerTournamentFormat(session, counters)
}

function incrementAttendance(players, attendance) {
    for (const player of players) {
        attendance.set(player, (attendance.get(player) || 0) + 1)
    }
}

function updateLargestSession(playerCount, date, counters) {
    if (!counters.largestSession || playerCount > counters.largestSession.playerCount) {
        counters.largestSession = {
            playerCount,
            date,
        }
    }
}

function registerCourtCount(courtCount, counters) {
    counters.totalCourts += courtCount
    counters.courtCounts.set(courtCount, (counters.courtCounts.get(courtCount) || 0) + 1)
}

function registerTournamentFormat(session, counters) {
    if (session.mode !== "tournament") {
        return
    }
    counters.tournamentSessions += 1
    const formatKey = session.tournamentSeries?.format || session.tournamentFormat || "tournament"
    counters.tournamentFormats.set(formatKey, (counters.tournamentFormats.get(formatKey) || 0) + 1)
}

function finalizeSessionInsights(sessions, counters) {
    const attendanceRows = mapCountRows(counters.attendance, "session", "sessionCount")
    const sitOutRows = mapCountRows(counters.sitOuts, "sit-out", "sitOutCount")
    const topAttendance = attendanceRows[0] || null
    const topSitOut = sitOutRows[0] || null
    const topCourtCount = pickTopCountEntry(counters.courtCounts)
    const topTournamentFormat = pickTopCountEntry(counters.tournamentFormats)
    return {
        attendanceRows,
        sitOutRows,
        resumeCards: buildResumeCards(sessions.length, counters, topTournamentFormat),
        facts: buildFacts({
            sessions,
            topAttendance,
            topSitOut,
            topCourtCount,
            largestSession: counters.largestSession,
            tournamentSessions: counters.tournamentSessions,
        }),
    }
}

function buildResumeCards(sessionCount, counters, topTournamentFormat) {
    return [
        {
            label: "Sessions In Scope",
            value: String(sessionCount),
            meta: "Active history only",
        },
        {
            label: "Tournament Sessions",
            value: String(counters.tournamentSessions),
            meta:
                sessionCount > 0 ? `${formatShare(counters.tournamentSessions, sessionCount)} of scope` : "No sessions",
        },
        {
            label: "Top Tournament Format",
            value: topTournamentFormat ? formatTournamentFormatLabel(topTournamentFormat[0]) : "—",
            meta: topTournamentFormat ? `${topTournamentFormat[1]} sessions` : "No tournaments",
        },
        {
            label: "Average Courts",
            value: sessionCount > 0 ? (counters.totalCourts / sessionCount).toFixed(SINGLE_DECIMAL_PLACES) : "—",
            meta: "Per saved session",
        },
    ]
}

function buildFacts({ sessions, topAttendance, topSitOut, topCourtCount, largestSession, tournamentSessions }) {
    const facts = []
    if (topAttendance) {
        facts.push({
            label: "Most attending player",
            value: topAttendance.name,
            meta: `${topAttendance.sessionCount} sessions`,
        })
    }
    if (largestSession) {
        facts.push({
            label: "Largest session",
            value: `${largestSession.playerCount} players`,
            meta: largestSession.date || "Saved history",
        })
    }
    facts.push({
        label: "Tournament share",
        value: sessions.length > 0 ? formatShare(tournamentSessions, sessions.length) : "0%",
        meta: `${tournamentSessions}/${sessions.length} sessions`,
    })
    if (topCourtCount) {
        facts.push({
            label: "Most common court setup",
            value: `${topCourtCount[0]} courts`,
            meta: `${topCourtCount[1]} sessions`,
        })
    }
    if (topSitOut) {
        facts.push({
            label: "Most frequent sit-out",
            value: topSitOut.name,
            meta: `${topSitOut.sitOutCount} sit-outs`,
        })
    }
    return facts
}

function accumulateSitOuts(session, sitOuts) {
    const groups = Array.isArray(session.tournamentSeries?.tournaments)
        ? session.tournamentSeries.tournaments
        : [session]
    for (const group of groups) {
        incrementSitOutList(group.tournamentLevelSitOuts || [], sitOuts)
        for (const round of group.rounds || []) {
            incrementSitOutList(round.sitOuts || [], sitOuts)
        }
    }
}

function incrementSitOutList(players, sitOuts) {
    for (const player of players) {
        sitOuts.set(player, (sitOuts.get(player) || 0) + 1)
    }
}

function mapCountRows(source, singularLabel, valueKey) {
    return [...source.entries()].sort(compareCountEntries).map(([name, count]) => ({
        name,
        [valueKey]: count,
        meta: `${count} ${count === 1 ? singularLabel : `${singularLabel}s`}`,
    }))
}

function pickTopCountEntry(source) {
    return [...source.entries()].sort(compareCountEntries)[0] || null
}

function compareCountEntries(a, b) {
    if (b[1] !== a[1]) {
        return b[1] - a[1]
    }
    return String(a[0]).localeCompare(String(b[0]))
}

function formatTournamentFormatLabel(key) {
    const labels = {
        elimination: "Elimination",
        consolation: "Consolation",
        "round-robin": "Round Robin",
        tournament: "Tournament",
    }
    return labels[key] || "Tournament"
}

function formatShare(value, total) {
    return `${Math.round((value / total) * PERCENT_SCALE)}%`
}

export { buildSessionInsights }
