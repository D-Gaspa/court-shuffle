import { buildStatsModel, STATS_SCOPE_OPTIONS } from "./analytics.js"
import {
    createEmptyState,
    createHero,
    createPlayerSummaryPanel,
    createRelationshipsGrid,
    createShell,
    createStatsIcon,
} from "./dom.js"
import { buildHeatmapCard } from "./heatmap.js"
import { createGlobalHighlightsPanel, createGlobalLeaderboardsPanel, createScopeFilterPanel } from "./overview.js"
import { createPlayerListPanel } from "./player-list.js"

let selectedPlayerName = null
let selectedScopeKey = STATS_SCOPE_OPTIONS[0].key
let lastStatsHistory = []
let lastStatsRoot = null
let heatmapMetricByKind = {
    partner: "frequency",
    opponent: "frequency",
}

function renderStats(history, root) {
    if (!root) {
        return
    }
    lastStatsHistory = history
    lastStatsRoot = root
    root.textContent = ""
    const model = buildStatsModel(history, { scopeKey: selectedScopeKey })
    const shell = createShell()
    shell.appendChild(buildStatsBody(model))
    root.appendChild(shell)
}

function buildStatsBody(model) {
    if (!model.hasHistory) {
        return createEmptyState({
            title: "No sessions yet",
            subtitle: "Play and save a session to unlock crew analytics.",
            icon: createStatsIcon(),
        })
    }
    if (!model.hasPlayedMatches) {
        return buildNoScoredMatchesBoard(model)
    }
    return buildDashboard(model)
}

function buildDashboard(model) {
    const selectedPlayer = resolveSelectedPlayer(model)
    const board = document.createElement("div")
    board.className = "stats-board"
    board.appendChild(buildScopeFilter(model))
    board.appendChild(createHero(model))
    board.appendChild(createGlobalHighlightsPanel(model.global))
    board.appendChild(createGlobalLeaderboardsPanel(model.global))
    board.appendChild(
        createPlayerListPanel(model.players, selectedPlayer, model.playerSummariesByName, handlePlayerSelection()),
    )
    board.appendChild(
        createPlayerSummaryPanel(selectedPlayer, model.playerSummariesByName[selectedPlayer], model.global.scope.label),
    )
    board.appendChild(buildRelationshipPanels(selectedPlayer, model))
    board.appendChild(buildHeatmaps(model, selectedPlayer))
    return board
}

function buildNoScoredMatchesBoard(model) {
    const board = document.createElement("div")
    board.className = "stats-board"
    board.appendChild(buildScopeFilter(model))
    board.appendChild(
        createEmptyState({
            title: "No scored matches in this window",
            subtitle: "Try a wider time window or save sessions with entered scores.",
            icon: createStatsIcon(),
        }),
    )
    return board
}

function buildScopeFilter(model) {
    return createScopeFilterPanel({
        options: STATS_SCOPE_OPTIONS,
        selectedKey: selectedScopeKey,
        scopeMeta: model.global.scope,
        onSelect: handleScopeSelection(),
    })
}

function resolveSelectedPlayer(model) {
    if (selectedPlayerName && model.players.includes(selectedPlayerName)) {
        return selectedPlayerName
    }
    selectedPlayerName = model.defaultSelectedPlayer
    return selectedPlayerName
}

function handlePlayerSelection() {
    return (name) => {
        selectedPlayerName = name
        rerenderStats()
    }
}

function handleScopeSelection() {
    return (scopeKey) => {
        if (selectedScopeKey === scopeKey) {
            return
        }
        selectedScopeKey = scopeKey
        rerenderStats()
    }
}

function rerenderStats() {
    renderStats(lastStatsHistory, lastStatsRoot)
}

function buildRelationshipPanels(selectedPlayer, model) {
    const grid = createRelationshipsGrid(selectedPlayer, {
        partners: model.relationshipsByPlayer.partners[selectedPlayer],
        opponents: model.relationshipsByPlayer.opponents[selectedPlayer],
    })
    grid.classList.add("stagger-4")
    return grid
}

function buildHeatmaps(model, selectedPlayer) {
    const wrap = document.createElement("div")
    wrap.className = "stats-heatmap-grid"
    wrap.appendChild(buildHeatmapCardForKind("partner", "Partner", model, selectedPlayer))
    wrap.appendChild(buildHeatmapCardForKind("opponent", "Opponent", model, selectedPlayer))
    return wrap
}

function buildHeatmapCardForKind(kind, labelPrefix, model, selectedPlayer) {
    const metricKey = heatmapMetricByKind[kind] || "frequency"
    return buildHeatmapCard({
        kind,
        title: `${labelPrefix} Matrix`,
        subtitle: kind === "partner" ? "Pair synergy and frequency" : "Head-to-head volume and win rate",
        heatmapSet: model.heatmaps[kind],
        selectedPlayer,
        metricKey,
        onMetricChange: handleHeatmapMetricChange(kind),
    })
}

function handleHeatmapMetricChange(kind) {
    return (metricKey) => {
        if (heatmapMetricByKind[kind] === metricKey) {
            return
        }
        heatmapMetricByKind = {
            ...heatmapMetricByKind,
            [kind]: metricKey,
        }
        rerenderStats()
    }
}

export { renderStats }
