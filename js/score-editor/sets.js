export function normalizeSets(entry) {
    if (!entry) {
        return null
    }
    if (entry.sets && Array.isArray(entry.sets)) {
        return entry.sets
    }
    if (entry.score && Array.isArray(entry.score)) {
        return [entry.score]
    }
    return null
}

export function formatSets(sets) {
    return sets
        .filter(([a, b]) => a !== null && b !== null)
        .map((s) => {
            const base = `${s[0]}–${s[1]}`
            if (s[2]?.tb) {
                const [tbA, tbB] = s[2].tb
                if (tbA !== null && tbB !== null) {
                    return `${base} (${tbA}–${tbB})`
                }
            }
            return base
        })
        .join(", ")
}

/**
 * Count set wins from a list of sets.
 * Returns { winsA, winsB } considering only complete sets.
 */
export function countSetWins(sets) {
    let winsA = 0
    let winsB = 0
    for (const s of sets) {
        if (s[0] === null || s[1] === null) {
            continue
        }
        if (s[0] > s[1]) {
            winsA += 1
        } else if (s[1] > s[0]) {
            winsB += 1
        } else {
            winsA += 1
            winsB += 1
        }
    }
    return { winsA, winsB }
}

/**
 * Format a match summary showing set wins per side.
 * Returns e.g. "Team 1 (2) – Team 2 (1)" or null if no complete sets.
 */
export function formatMatchSummary(sets, teamLabels) {
    if (!teamLabels) {
        return null
    }
    const [labelA, labelB] = teamLabels
    const { winsA, winsB } = countSetWins(sets)
    if (winsA === 0 && winsB === 0) {
        return null
    }
    return `${labelA} (${winsA}) – ${labelB} (${winsB})`
}

export function cloneSets(sets) {
    return sets.map((s) => {
        const clone = [s[0], s[1]]
        if (s[2]?.tb) {
            clone.push({ tb: [...s[2].tb] })
        }
        return clone
    })
}

export function parseScoreValue(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) {
        return null
    }
    if (n < 0) {
        return 0
    }
    return Math.floor(n)
}

export function isComplete(sets) {
    if (sets.length === 0) {
        return false
    }
    for (const s of sets) {
        if (s[0] === null || s[1] === null) {
            return false
        }
    }
    return true
}
