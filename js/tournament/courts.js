/**
 * Tournament court scheduling helpers (queue execution over a logical round).
 */

import { determineMatchWinner } from "./utils.js"

function getQueueCourtLane(round, matchIndex) {
    const courtCount = Math.max(1, round?.courtSchedule?.courtCount || 1)
    const scheduledCourt = Number(round?.matches?.[matchIndex]?.court) || matchIndex + 1
    return ((scheduledCourt - 1) % courtCount) + 1
}

function isUnresolvedQueueMatch(round, matchIndex) {
    const score = round?.scores?.[matchIndex]
    return !(score && determineMatchWinner(score) !== null)
}

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
    const active = []
    if (!round?.matches) {
        return active
    }
    const activeByLane = new Map()
    for (let i = 0; i < round.matches.length; i += 1) {
        if (!isUnresolvedQueueMatch(round, i)) {
            continue
        }
        const lane = getQueueCourtLane(round, i)
        if (!activeByLane.has(lane)) {
            activeByLane.set(lane, i)
        }
    }
    for (const index of activeByLane.values()) {
        active.push(index)
    }
    active.sort((left, right) => left - right)
    return active
}

function getQueuePendingIndexes(round) {
    const active = new Set(getQueueActiveIndexes(round))
    const pending = []
    if (!round?.matches) {
        return pending
    }
    for (let i = 0; i < round.matches.length; i += 1) {
        if (!isUnresolvedQueueMatch(round, i)) {
            continue
        }
        if (!active.has(i)) {
            pending.push(i)
        }
    }
    return pending
}

export { attachTournamentCourtSchedule, ensureTournamentCourtSchedule, getQueueActiveIndexes, getQueuePendingIndexes }
