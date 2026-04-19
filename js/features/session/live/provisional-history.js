function isProvisionalHistorySession(session) {
    return session?.provisional === true
}

function markHistoryEntryProvisional(historyEntry, provisional) {
    return {
        ...historyEntry,
        provisional: provisional === true,
    }
}

function upsertHistorySession(history, historyEntry) {
    const nextHistory = Array.isArray(history) ? history : []
    const index = nextHistory.findIndex((entry) => entry?.id === historyEntry?.id)
    if (index === -1) {
        nextHistory.push(historyEntry)
        return historyEntry
    }
    nextHistory[index] = historyEntry
    return historyEntry
}

function removeHistorySession(history, sessionId) {
    if (!(Array.isArray(history) && sessionId)) {
        return
    }
    const index = history.findIndex((entry) => entry?.id === sessionId)
    if (index !== -1) {
        history.splice(index, 1)
    }
}

function getCommittedHistory(history, sessionIdToExclude = null) {
    return (history || []).filter(
        (session) =>
            !isProvisionalHistorySession(session) && (!sessionIdToExclude || session?.id !== sessionIdToExclude),
    )
}

export {
    getCommittedHistory,
    isProvisionalHistorySession,
    markHistoryEntryProvisional,
    removeHistorySession,
    upsertHistorySession,
}
