function buildPlayerDiff(basePlayers, selectedPlayers) {
    const previous = new Set(basePlayers || [])
    const next = new Set(selectedPlayers || [])
    const added = [...next].filter((player) => !previous.has(player))
    const removed = [...previous].filter((player) => !next.has(player))
    return { added, removed }
}

function buildRosterSummary(basePlayers, selectedPlayers) {
    const { added, removed } = buildPlayerDiff(basePlayers, selectedPlayers)
    if (added.length === 0 && removed.length === 0) {
        return "Change the roster before continuing. A continuation phase must add or remove at least one player."
    }

    const changes = []
    if (added.length > 0) {
        changes.push(`Added: ${added.join(", ")}`)
    }
    if (removed.length > 0) {
        changes.push(`Removed: ${removed.join(", ")}`)
    }
    return changes.join(" · ")
}

function buildCourtSummary(continuation, tournamentDraft) {
    const previousCourtCount = continuation?.baseCourtCount ?? tournamentDraft.courtCount
    return `Court count stays locked at ${previousCourtCount}.`
}

function buildFlexSummary(continuation, tournamentDraft) {
    const previousFlex = Boolean(continuation?.baseAllowNotStrictDoubles)
    const nextFlex = Boolean(tournamentDraft.allowNotStrictDoubles)
    if (previousFlex === nextFlex) {
        return nextFlex ? "2v1 doubles remains enabled." : "2v1 doubles remains disabled."
    }
    return nextFlex
        ? "2v1 doubles will be enabled for the next phase."
        : "2v1 doubles will be disabled for the next phase."
}

function buildAbandonmentSummary(continuation) {
    const abandonedCount = continuation?.abandonedTournamentCount ?? 0
    if (abandonedCount <= 0) {
        return "No future mini tournaments are waiting in the current phase."
    }
    const noun = abandonedCount === 1 ? "mini tournament" : "mini tournaments"
    return `${abandonedCount} unplayed ${noun} in the current phase will be abandoned when you continue.`
}

function buildContinuationSummaryModel({ draft, selectedPlayers }) {
    if (!draft?.continuation) {
        return null
    }

    return {
        title: "This will append a new phase to the same saved session.",
        items: [
            `Continue after Phase ${(draft.continuation.sourcePhaseIndex ?? 0) + 1}, Tournament ${(draft.continuation.sourceTournamentIndex ?? 0) + 1}.`,
            buildRosterSummary(draft.continuation.basePlayers || [], selectedPlayers),
            buildCourtSummary(draft.continuation, draft.tournament),
            buildFlexSummary(draft.continuation, draft.tournament),
            buildAbandonmentSummary(draft.continuation),
        ],
    }
}

function renderContinuationSummary({ draft, selectedPlayers, summaryBodyElement, summaryElement }) {
    const model = buildContinuationSummaryModel({ draft, selectedPlayers })
    summaryElement.hidden = !model
    summaryBodyElement.textContent = ""
    if (!model) {
        return
    }

    const title = document.createElement("p")
    title.className = "continuation-summary-title"
    title.textContent = model.title
    summaryBodyElement.appendChild(title)

    const list = document.createElement("ul")
    list.className = "continuation-summary-list"
    for (const item of model.items) {
        const listItem = document.createElement("li")
        listItem.textContent = item
        list.appendChild(listItem)
    }
    summaryBodyElement.appendChild(list)
}

export { buildContinuationSummaryModel, renderContinuationSummary }
