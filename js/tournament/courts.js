/**
 * Tournament court scheduling helpers (queue vs batch execution over a logical round).
 */

import { determineMatchWinner } from "./utils.js"

function buildBatches(matchCount, courtCount) {
    const batches = []
    const width = Math.max(1, courtCount || 1)
    for (let i = 0; i < matchCount; i += width) {
        const batch = []
        for (let j = i; j < Math.min(matchCount, i + width); j += 1) {
            batch.push(j)
        }
        batches.push(batch)
    }
    return batches
}

function attachTournamentCourtSchedule(round, courtCount, mode) {
    const matchCount = round?.matches?.length || 0
    const normalizedCourtCount = Math.max(1, courtCount || 1)
    round.courtSchedule = {
        courtCount: normalizedCourtCount,
        mode: mode === "batches" ? "batches" : "queue",
    }
    if (round.courtSchedule.mode === "batches") {
        round.courtSchedule.batches = buildBatches(matchCount, normalizedCourtCount)
        if (typeof round.courtSchedule.activeBatchIndex !== "number") {
            round.courtSchedule.activeBatchIndex = 0
        }
    }
    return round
}

function ensureTournamentCourtSchedule(round, courtCount, mode) {
    if (!round) {
        return round
    }
    if (
        !round.courtSchedule ||
        round.courtSchedule.courtCount !== Math.max(1, courtCount || 1) ||
        round.courtSchedule.mode !== mode
    ) {
        return attachTournamentCourtSchedule(round, courtCount, mode)
    }
    if (mode === "batches" && !Array.isArray(round.courtSchedule.batches)) {
        return attachTournamentCourtSchedule(round, courtCount, mode)
    }
    return round
}

function getBatchIndexes(round) {
    if (!round?.matches) {
        return []
    }
    const schedule = round.courtSchedule
    if (!(schedule?.mode === "batches" && Array.isArray(schedule.batches) && schedule.batches.length > 0)) {
        return round.matches.map((_, i) => i)
    }
    const idx = Math.max(0, Math.min(schedule.activeBatchIndex || 0, schedule.batches.length - 1))
    return schedule.batches[idx]
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

function getBatchBlockReason(round, getRoundScoreBlockReason) {
    const batchIndexes = getBatchIndexes(round)
    if (batchIndexes.length === 0) {
        return null
    }
    const tempRound = {
        matches: batchIndexes.map((i) => round.matches[i]),
        scores: batchIndexes.map((i) => (round.scores ? round.scores[i] : null)),
    }
    return getRoundScoreBlockReason(tempRound)
}

export {
    attachTournamentCourtSchedule,
    ensureTournamentCourtSchedule,
    getBatchIndexes,
    getQueueActiveIndexes,
    getQueuePendingIndexes,
    getBatchBlockReason,
}
