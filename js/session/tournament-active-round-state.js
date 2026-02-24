import { getBatchIndexes, getQueueActiveIndexes, getQueuePendingIndexes } from "../tournament/courts.js"

function appendExecutionInfo(round, session, container) {
    const schedule = round.courtSchedule
    if (!schedule || (round.matches?.length || 0) <= (schedule.courtCount || 1)) {
        return
    }

    const info = document.createElement("div")
    info.className = "hint"
    if (schedule.mode === "batches") {
        const total = schedule.batches?.length || 1
        const idx = (schedule.activeBatchIndex || 0) + 1
        info.textContent = `${session.courtCount} courts · Batch ${idx} of ${total}`
    } else {
        const queuePending = getQueuePendingIndexes(round).length
        info.textContent =
            queuePending > 0 ? `${session.courtCount} courts · ${queuePending} next up` : `${session.courtCount} courts`
    }
    container.appendChild(info)
}

function renderTournamentLevelSitOuts(session, ui) {
    const sitOuts = session.tournamentLevelSitOuts || []
    if (!Array.isArray(sitOuts) || sitOuts.length === 0) {
        return
    }
    ui.sitOutContainer.hidden = false
    if (ui.sitOutList.children.length === 0) {
        ui.sitOutList.textContent = ""
    }
    for (const player of sitOuts) {
        const chip = document.createElement("div")
        chip.className = "sit-out-chip"
        const name = document.createElement("span")
        name.textContent = `${player} (tournament sit-out)`
        chip.appendChild(name)
        ui.sitOutList.appendChild(chip)
    }
}

function getTournamentRoundDisplayState(round) {
    const schedule = round.courtSchedule
    if (!schedule || schedule.mode === "queue") {
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

    const batchIndexes = getBatchIndexes(round)
    const currentBatchSet = new Set(batchIndexes)
    return {
        editableIndices: currentBatchSet,
        mainVisibleIndices: currentBatchSet,
        queuePending: new Set(),
    }
}

export { appendExecutionInfo, getTournamentRoundDisplayState, renderTournamentLevelSitOuts }
