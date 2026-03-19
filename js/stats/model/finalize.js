import { buildGlobalLeaders, buildHeatmapSet } from "./derived.js"

const MIN_RELATIONSHIP_MATCHES = 2
const CHEMISTRY_PRIOR_WINS = 2
const CHEMISTRY_PRIOR_MATCHES = 4
const CHEMISTRY_SCORE_SCALE = 100

function finalizeStatsModel({ sessions, acc, scope }) {
    const playerSummariesByName = finalizePlayerSummaries(acc.playerSummaries)
    const players = sortPlayersForSelector(Object.keys(playerSummariesByName))
    const partnerLists = finalizeRelationLists(acc.partnerRelations, "partner")
    const opponentLists = finalizeRelationLists(acc.opponentRelations, "opponent")
    fillMissingRelationshipKeys(players, partnerLists)
    fillMissingRelationshipKeys(players, opponentLists)
    return {
        hasHistory: sessions.length > 0,
        hasPlayedMatches: acc.playedMatchCount > 0,
        players,
        defaultSelectedPlayer: getDefaultSelectedPlayer(playerSummariesByName, players),
        global: {
            scope,
            playedMatchCount: acc.playedMatchCount,
            decidedMatchCount: acc.decidedMatchCount,
            leaders: buildGlobalLeaders(playerSummariesByName),
        },
        playerSummariesByName,
        relationshipsByPlayer: {
            partners: partnerLists,
            opponents: opponentLists,
        },
        heatmaps: {
            partner: buildHeatmapSet(players, acc.partnerMatrix, acc.partnerRelations),
            opponent: buildHeatmapSet(players, acc.opponentMatrix, acc.opponentRelations),
        },
    }
}

function finalizePlayerSummaries(playerSummaries) {
    const result = {}
    for (const [name, summary] of playerSummaries) {
        const decidedMatches = summary.wins + summary.losses
        result[name] = {
            ...summary,
            decidedMatches,
            winRate: decidedMatches > 0 ? summary.wins / decidedMatches : null,
            avgGameDiff: decidedMatches > 0 ? summary.totalGameDiff / decidedMatches : null,
        }
    }
    return result
}

function finalizeRelationLists(relationMap, kind) {
    const result = {}
    for (const [player, others] of relationMap) {
        const rows = []
        for (const [name, stats] of others) {
            if (!shouldIncludeRelationship(stats, kind)) {
                continue
            }
            rows.push(finalizeRelationRow(name, stats, kind))
        }
        rows.sort(kind === "partner" ? compareFavoritePartners : compareNemesisOpponents)
        result[player] = rows
    }
    return result
}

function shouldIncludeRelationship(stats, kind) {
    if (stats.matches < MIN_RELATIONSHIP_MATCHES) {
        return false
    }
    if (kind === "partner") {
        return stats.wins > 0
    }
    return stats.losses > 0
}

function finalizeRelationRow(name, stats, kind) {
    const matches = stats.wins + stats.losses
    const row = {
        name,
        matches,
        wins: stats.wins,
        losses: stats.losses,
        totalGameDiff: stats.totalGameDiff,
        winRate: matches > 0 ? stats.wins / matches : null,
        avgGameDiff: matches > 0 ? stats.totalGameDiff / matches : null,
    }
    if (kind === "partner") {
        row.chemistryScore = Math.round(
            CHEMISTRY_SCORE_SCALE * ((stats.wins + CHEMISTRY_PRIOR_WINS) / (matches + CHEMISTRY_PRIOR_MATCHES)),
        )
    }
    return row
}

function compareFavoritePartners(a, b) {
    const chemistryGap = (b.chemistryScore ?? -1) - (a.chemistryScore ?? -1)
    if (chemistryGap !== 0) {
        return chemistryGap
    }
    if (b.matches !== a.matches) {
        return b.matches - a.matches
    }
    const diffGap = (b.avgGameDiff ?? Number.NEGATIVE_INFINITY) - (a.avgGameDiff ?? Number.NEGATIVE_INFINITY)
    if (diffGap !== 0) {
        return diffGap
    }
    return a.name.localeCompare(b.name)
}

function compareNemesisOpponents(a, b) {
    const winRateGap = (a.winRate ?? 2) - (b.winRate ?? 2)
    if (winRateGap !== 0) {
        return winRateGap
    }
    if (b.matches !== a.matches) {
        return b.matches - a.matches
    }
    const diffGap = (a.avgGameDiff ?? Number.POSITIVE_INFINITY) - (b.avgGameDiff ?? Number.POSITIVE_INFINITY)
    if (diffGap !== 0) {
        return diffGap
    }
    return a.name.localeCompare(b.name)
}

function sortPlayersForSelector(players) {
    return [...players].sort((a, b) => a.localeCompare(b))
}

function getDefaultSelectedPlayer(playerSummariesByName, players) {
    if (players.length === 0) {
        return null
    }
    return [...players].sort(compareBySelectionPriority(playerSummariesByName))[0]
}

function compareBySelectionPriority(playerSummariesByName) {
    return (a, b) => {
        const aStats = playerSummariesByName[a]
        const bStats = playerSummariesByName[b]
        if (bStats.decidedMatches !== aStats.decidedMatches) {
            return bStats.decidedMatches - aStats.decidedMatches
        }
        if (bStats.playedMatches !== aStats.playedMatches) {
            return bStats.playedMatches - aStats.playedMatches
        }
        return a.localeCompare(b)
    }
}

function fillMissingRelationshipKeys(players, relationshipsByPlayer) {
    for (const player of players) {
        if (!relationshipsByPlayer[player]) {
            relationshipsByPlayer[player] = []
        }
    }
}

export { finalizeStatsModel }
