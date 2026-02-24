/**
 * Tournament court scheduling helpers (queue execution over a logical round).
 */

import { determineMatchWinner } from "./utils.js"

function attachTournamentCourtSchedule(round, courtCount) {
    const normalizedCourtCount = Math.max(1, courtCount || 1)
    round.courtSchedule = {
        courtCount: normalizedCourtCount,
        mode: "queue",
    }
    return round
}

function ensureTournamentCourtSchedule(round, courtCount) {
    if (!round) {
        return round
    }
    if (!round.courtSchedule || round.courtSchedule.courtCount !== Math.max(1, courtCount || 1)) {
        return attachTournamentCourtSchedule(round, courtCount)
    }
    if (round.courtSchedule.mode !== "queue") {
        return attachTournamentCourtSchedule(round, courtCount)
    }
    return round
}

function getQueueActiveIndexes(round) {
    const courtCount = Math.max(1, round?.courtSchedule?.courtCount || 1)
    const active = []
    if (!round?.matches) {
        return active
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        const score = round.scores?.[i]
        if (score && determineMatchWinner(score) !== null) {
            continue
        }
        active.push(i)
        if (active.length >= courtCount) {
            break
        }
    }
    return active
}

function getQueuePendingIndexes(round) {
    const active = new Set(getQueueActiveIndexes(round))
    const pending = []
    if (!round?.matches) {
        return pending
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        const score = round.scores?.[i]
        if (score && determineMatchWinner(score) !== null) {
            continue
        }
        if (!active.has(i)) {
            pending.push(i)
        }
    }
    return pending
}

export { attachTournamentCourtSchedule, ensureTournamentCourtSchedule, getQueueActiveIndexes, getQueuePendingIndexes }
