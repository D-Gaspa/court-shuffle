import { getQueueActiveIndexes, getQueuePendingIndexes } from "../../../tournament/courts.js"

function appendExecutionInfo(round, session, container) {
    const schedule = round.courtSchedule
    if (!schedule || (round.matches?.length || 0) <= (schedule.courtCount || 1)) {
        return
    }

    const info = document.createElement("div")
    info.className = "hint"
    const queuePending = getQueuePendingIndexes(round).length
    info.textContent =
        queuePending > 0 ? `${session.courtCount} courts · ${queuePending} next up` : `${session.courtCount} courts`
    container.appendChild(info)
}

function renderTournamentLevelSitOuts(session, ui) {
    const sitOuts = session.tournamentLevelSitOuts || []
    for (const chip of ui.sitOutList.querySelectorAll(".tournament-sit-out-chip")) {
        chip.remove()
    }
    if (!Array.isArray(sitOuts) || sitOuts.length === 0) {
        return
    }
    ui.sitOutContainer.hidden = false
    for (const player of sitOuts) {
        const chip = document.createElement("div")
        chip.className = "sit-out-chip tournament-sit-out-chip"
        const name = document.createElement("span")
        name.textContent = `${player} (tournament sit-out)`
        chip.appendChild(name)
        ui.sitOutList.appendChild(chip)
    }
}

function getTournamentRoundDisplayState(round) {
    const queueActive = new Set(getQueueActiveIndexes(round))
    const queuePending = new Set(getQueuePendingIndexes(round))
    return {
        editableIndices: queueActive,
        mainVisibleIndices: new Set(
            round.matches
                .map((_, i) => i)
                .filter((i) => round.scores?.[i] || queueActive.has(i) || !queuePending.has(i)),
        ),
        queuePending,
    }
}

export { appendExecutionInfo, getTournamentRoundDisplayState, renderTournamentLevelSitOuts }
