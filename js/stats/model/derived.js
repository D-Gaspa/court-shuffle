const LEADERBOARD_LIMIT = 5
const MIN_RATE_LEADER_MATCHES = 3
const PERCENT_SCALE = 100

function buildHeatmapSet(players, countMatrixMap, relationMap) {
    return {
        frequency: buildCountHeatmap(countMatrixMap, players),
        winRate: buildRelationMetricHeatmap(relationMap, players, "winRate"),
    }
}

function buildCountHeatmap(matrixMap, players) {
    const matrix = []
    let max = 0
    for (const rowPlayer of players) {
        const row = []
        const source = matrixMap.get(rowPlayer)
        for (const colPlayer of players) {
            const value = rowPlayer === colPlayer ? 0 : (source?.get(colPlayer) ?? 0)
            if (value > max) {
                max = value
            }
            row.push(value)
        }
        matrix.push(row)
    }
    return {
        kind: "count",
        players,
        matrix,
        max,
        min: 0,
        sampleMatrix: null,
    }
}

function buildRelationMetricHeatmap(relationMap, players, metricName) {
    const matrix = []
    const sampleMatrix = []
    for (const rowPlayer of players) {
        const row = []
        const sampleRow = []
        const source = relationMap.get(rowPlayer)
        for (const colPlayer of players) {
            if (rowPlayer === colPlayer) {
                row.push(null)
                sampleRow.push(0)
                continue
            }
            const stats = source?.get(colPlayer)
            const decidedMatches = (stats?.wins || 0) + (stats?.losses || 0)
            sampleRow.push(decidedMatches)
            row.push(resolveRelationMetricValue(stats, metricName, decidedMatches))
        }
        matrix.push(row)
        sampleMatrix.push(sampleRow)
    }
    return {
        kind: metricName,
        players,
        matrix,
        sampleMatrix,
        min: 0,
        max: 1,
    }
}

function resolveRelationMetricValue(stats, metricName, decidedMatches) {
    if (!stats || decidedMatches === 0) {
        return null
    }
    if (metricName === "winRate") {
        return stats.wins / decidedMatches
    }
    return null
}

function buildGlobalLeaders(playerSummariesByName) {
    const rows = Object.entries(playerSummariesByName).map(([name, stats]) => ({ name, ...stats }))
    return {
        highlights: buildLeaderHighlights(rows),
        leaderboards: {
            mostWins: rows.slice().sort(compareMostWins).slice(0, LEADERBOARD_LIMIT),
            bestWinRate: rows
                .filter((row) => row.decidedMatches >= MIN_RATE_LEADER_MATCHES)
                .sort(compareBestWinRate)
                .slice(0, LEADERBOARD_LIMIT),
            mostMatches: rows.slice().sort(compareMostMatches).slice(0, LEADERBOARD_LIMIT),
            bestAvgDiff: rows
                .filter((row) => row.decidedMatches >= MIN_RATE_LEADER_MATCHES)
                .sort(compareBestDiff)
                .slice(0, LEADERBOARD_LIMIT),
        },
    }
}

function buildLeaderHighlights(rows) {
    return [
        buildHighlight({
            rows,
            key: "bestWinRate",
            label: "Best Win Rate",
            emptyValue: "—",
            emptyMeta: `Need ${MIN_RATE_LEADER_MATCHES}+ matches`,
            picker: (list) =>
                list.filter((row) => row.decidedMatches >= MIN_RATE_LEADER_MATCHES).sort(compareBestWinRate)[0],
            formatValue: (row) => `${Math.round((row.winRate ?? 0) * PERCENT_SCALE)}%`,
            meta: (row) => `${row.decidedMatches} matches`,
        }),
        buildHighlight({
            rows,
            key: "mostWins",
            label: "Most Wins",
            emptyValue: "—",
            emptyMeta: "No decided matches",
            picker: (list) => list.slice().sort(compareMostWins)[0],
            formatValue: (row) => String(row.wins),
            meta: (row) => `${row.decidedMatches} matches`,
        }),
        buildHighlight({
            rows,
            key: "mostMatches",
            label: "Most Matches",
            emptyValue: "—",
            emptyMeta: "No decided matches",
            picker: (list) => list.slice().sort(compareMostMatches)[0],
            formatValue: (row) => String(row.decidedMatches),
            meta: (row) => `${row.wins}-${row.losses} record`,
        }),
        buildHighlight({
            rows,
            key: "bestDiff",
            label: "Best Avg Diff",
            emptyValue: "—",
            emptyMeta: `Need ${MIN_RATE_LEADER_MATCHES}+ matches`,
            picker: (list) =>
                list.filter((row) => row.decidedMatches >= MIN_RATE_LEADER_MATCHES).sort(compareBestDiff)[0],
            formatValue: (row) => formatSignedWhole(row.avgGameDiff),
            meta: (row) => `${row.decidedMatches} matches`,
        }),
    ]
}

function buildHighlight(config) {
    const winner = config.picker(config.rows)
    if (!winner || winner.decidedMatches === 0) {
        return {
            key: config.key,
            label: config.label,
            playerName: null,
            value: config.emptyValue,
            meta: config.emptyMeta,
        }
    }
    return {
        key: config.key,
        label: config.label,
        playerName: winner.name,
        value: config.formatValue(winner),
        meta: config.meta(winner),
    }
}

function compareMostWins(a, b) {
    if (b.wins !== a.wins) {
        return b.wins - a.wins
    }
    if (b.decidedMatches !== a.decidedMatches) {
        return b.decidedMatches - a.decidedMatches
    }
    return a.name.localeCompare(b.name)
}

function compareBestWinRate(a, b) {
    const gap = (b.winRate ?? -1) - (a.winRate ?? -1)
    if (gap !== 0) {
        return gap
    }
    if (b.decidedMatches !== a.decidedMatches) {
        return b.decidedMatches - a.decidedMatches
    }
    return a.name.localeCompare(b.name)
}

function compareMostMatches(a, b) {
    if (b.decidedMatches !== a.decidedMatches) {
        return b.decidedMatches - a.decidedMatches
    }
    if (b.wins !== a.wins) {
        return b.wins - a.wins
    }
    return a.name.localeCompare(b.name)
}

function compareBestDiff(a, b) {
    const gap = (b.avgGameDiff ?? Number.NEGATIVE_INFINITY) - (a.avgGameDiff ?? Number.NEGATIVE_INFINITY)
    if (gap !== 0) {
        return gap
    }
    if (b.decidedMatches !== a.decidedMatches) {
        return b.decidedMatches - a.decidedMatches
    }
    return a.name.localeCompare(b.name)
}

function formatSignedWhole(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "—"
    }
    const rounded = value.toFixed(1)
    return value > 0 ? `+${rounded}` : rounded
}

export { buildHeatmapSet, buildGlobalLeaders }
