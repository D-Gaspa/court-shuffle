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
    return sets.map((s) => `${s[0]}–${s[1]}`).join(", ")
}

export function cloneSets(sets) {
    return sets.map((s) => [s[0], s[1]])
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
    for (const [a, b] of sets) {
        if (a === null || b === null) {
            return false
        }
    }
    return true
}
