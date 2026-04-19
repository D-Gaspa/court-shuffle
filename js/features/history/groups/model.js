function compareHistoryEntries(left, right) {
    const leftTime = new Date(left?.date || 0).getTime()
    const rightTime = new Date(right?.date || 0).getTime()
    if (leftTime !== rightTime) {
        return leftTime - rightTime
    }
    return String(left?.id || "").localeCompare(String(right?.id || ""))
}

function getNightPreviousSessionId(session) {
    return typeof session?.night?.previousSessionId === "string" && session.night.previousSessionId
        ? session.night.previousSessionId
        : null
}

function getSessionNightMode(session) {
    if (session?.mode !== "tournament") {
        return null
    }
    let teamSize = session.tournamentTeamSize ?? null
    if (!(teamSize === 1 || teamSize === 2)) {
        if (session.tournamentSeries?.matchType === "singles") {
            teamSize = 1
        } else if (session.tournamentSeries?.matchType === "doubles") {
            teamSize = 2
        }
    }
    if (!(teamSize === 1 || teamSize === 2)) {
        return null
    }
    return `tournament:${teamSize}`
}

function canSessionsShareNight(previousSession, nextSession) {
    const previousMode = getSessionNightMode(previousSession)
    return previousMode !== null && previousMode === getSessionNightMode(nextSession)
}

function buildOrderedHistoryIndex(sessions) {
    const orderedSessions = [...(sessions || [])].sort(compareHistoryEntries)
    return {
        orderedSessions,
        sessionMap: new Map(orderedSessions.map((session) => [session.id, session])),
        sessionIndexMap: new Map(orderedSessions.map((session, index) => [session.id, index])),
    }
}

function resolveNightRootSessionId(session, sessionMap, sessionIndexMap, seen = new Set()) {
    if (!session?.id || seen.has(session.id)) {
        return session?.id || null
    }
    seen.add(session.id)
    const previousSessionId = getNightPreviousSessionId(session)
    if (!previousSessionId) {
        return session.id
    }
    const previousSession = sessionMap.get(previousSessionId)
    if (!previousSession) {
        return session.id
    }
    if ((sessionIndexMap.get(previousSession.id) ?? -1) >= (sessionIndexMap.get(session.id) ?? -1)) {
        return session.id
    }
    if (!canSessionsShareNight(previousSession, session)) {
        return session.id
    }
    return resolveNightRootSessionId(previousSession, sessionMap, sessionIndexMap, seen)
}

function countTournamentRounds(tournaments) {
    return tournaments.reduce((sum, run) => sum + (run?.rounds?.length || 0), 0)
}

function collectSessionTournamentMetrics(session) {
    if (session.mode !== "tournament") {
        return {
            roundCount: session.rounds?.length || 0,
            tournamentCount: 0,
        }
    }
    const phases = Array.isArray(session.phases) && session.phases.length > 0 ? session.phases : null
    if (phases) {
        return phases.reduce(
            (metrics, phase) => {
                const tournaments = phase?.tournamentSeries?.tournaments || []
                return {
                    roundCount: metrics.roundCount + countTournamentRounds(tournaments),
                    tournamentCount: metrics.tournamentCount + tournaments.length,
                }
            },
            { roundCount: 0, tournamentCount: 0 },
        )
    }
    const tournaments = session.tournamentSeries?.tournaments || []
    return {
        roundCount: countTournamentRounds(tournaments),
        tournamentCount: tournaments.length,
    }
}

function collectNightGroupMetrics(sessions) {
    const distinctPlayers = new Set()
    let roundCount = 0
    let tournamentCount = 0
    for (const session of sessions) {
        for (const player of session.players || []) {
            distinctPlayers.add(player)
        }
        const metrics = collectSessionTournamentMetrics(session)
        roundCount += metrics.roundCount
        tournamentCount += metrics.tournamentCount
    }
    return {
        playerCount: distinctPlayers.size,
        roundCount,
        tournamentCount,
    }
}

function buildNightGroupRecord(sessions) {
    const metrics = collectNightGroupMetrics(sessions)
    const firstSession = sessions[0] || null
    const lastSession = sessions.at(-1) || null
    return {
        id: `night:${firstSession?.id || "unknown"}`,
        type: "night-group",
        sessions,
        date: firstSession?.date || lastSession?.date || "",
        lastDate: lastSession?.date || firstSession?.date || "",
        mode: firstSession?.mode || null,
        nightMode: getSessionNightMode(firstSession),
        playerCount: metrics.playerCount,
        roundCount: metrics.roundCount,
        tournamentCount: metrics.tournamentCount,
    }
}

function buildHistoryNightGroups(sessions) {
    const { orderedSessions, sessionMap, sessionIndexMap } = buildOrderedHistoryIndex(sessions)
    const grouped = new Map()
    for (const session of orderedSessions) {
        const rootId = resolveNightRootSessionId(session, sessionMap, sessionIndexMap) || session.id
        if (!grouped.has(rootId)) {
            grouped.set(rootId, [])
        }
        grouped.get(rootId).push(session)
    }
    return [...grouped.values()].map(buildNightGroupRecord)
}

function findPreviousHistorySession(sessions, sessionId) {
    const orderedSessions = [...(sessions || [])].sort(compareHistoryEntries)
    const index = orderedSessions.findIndex((session) => session.id === sessionId)
    if (index <= 0) {
        return null
    }
    return orderedSessions[index - 1] || null
}

function canLinkSessionToPreviousNight(sessions, session) {
    const previousSession = findPreviousHistorySession(sessions, session?.id)
    return Boolean(previousSession && canSessionsShareNight(previousSession, session))
}

function buildNightGroupLookup(sessions) {
    const groups = buildHistoryNightGroups(sessions)
    const lookup = new Map()
    for (const group of groups) {
        for (const session of group.sessions) {
            lookup.set(session.id, group)
        }
    }
    return lookup
}

export {
    buildHistoryNightGroups,
    buildNightGroupLookup,
    canLinkSessionToPreviousNight,
    canSessionsShareNight,
    compareHistoryEntries,
    findPreviousHistorySession,
    getNightPreviousSessionId,
    getSessionNightMode,
}
