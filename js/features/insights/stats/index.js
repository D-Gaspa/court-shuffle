import { createAnalyticsQueryPanel } from "../query/ui.js"
import { buildStatsModel } from "./model/index.js"
import { createEmptyState, createShell, createStatsIcon } from "./ui/dom.js"
import { createStatsSectionNav } from "./ui/overview.js"
import { buildMatchupsSection, buildOverviewSection, buildPlayersSection, buildSessionsSection } from "./ui/sections.js"

const STATS_SECTIONS = [
    { key: "overview", label: "Overview" },
    { key: "players", label: "Players" },
    { key: "matchups", label: "Matchups" },
    { key: "sessions", label: "Sessions" },
]

let selectedPlayerName = null
let selectedStatsSection = STATS_SECTIONS[0].key
let heatmapMetricByKind = {
    partner: "frequency",
    opponent: "frequency",
}
let lastRenderArgs = null

function renderStats({ analytics, root, onQueryChange, onResetQuery }) {
    if (!root) {
        return
    }
    lastRenderArgs = { analytics, root, onQueryChange, onResetQuery }
    root.textContent = ""
    const shell = createShell()
    appendQueryUi(shell, analytics, onQueryChange, onResetQuery)
    const model = buildStatsModel(analytics.filteredSessions, { queryMeta: analytics.summary })
    shell.appendChild(buildStatsBody(model))
    root.appendChild(shell)
}

function appendQueryUi(shell, analytics, onQueryChange, onResetQuery) {
    if (analytics.summary.totalSessionCount <= 0) {
        return
    }
    shell.appendChild(
        createAnalyticsQueryPanel({
            title: "Dossier Query",
            subtitle: "Time, mode, and format stay in sync with History. Player focus lives inside the dossier.",
            query: analytics.query,
            options: analytics.options,
            summary: analytics.summary,
            onQueryChange,
            onResetQuery,
            showPlayerFilter: false,
            idPrefix: "stats",
        }),
    )
    shell.appendChild(
        createStatsSectionNav({
            sections: STATS_SECTIONS,
            activeKey: selectedStatsSection,
            onSelect: handleSectionChange,
        }),
    )
}

function buildStatsBody(model) {
    if (!model.hasSourceHistory) {
        return createStatsEmptyState("No sessions yet", "Play and save a session to unlock the scouting dossier.")
    }
    if (!model.hasQueryResults) {
        return createStatsEmptyState(
            "No sessions match this query",
            "Adjust the shared query above to bring sessions back into scope.",
        )
    }
    if (!model.hasPlayedMatches) {
        return createStatsEmptyState(
            "No scored matches in this query",
            "This filter window has sessions, but none with saved scores yet.",
        )
    }
    return buildDashboard(model)
}

function createStatsEmptyState(title, subtitle) {
    return createEmptyState({
        title,
        subtitle,
        icon: createStatsIcon(),
    })
}

function buildDashboard(model) {
    const selectedPlayer = resolveSelectedPlayer(model)
    const board = document.createElement("div")
    board.className = "stats-board"
    board.appendChild(buildSectionBody(selectedStatsSection, model, selectedPlayer))
    return board
}

function buildSectionBody(sectionKey, model, selectedPlayer) {
    if (sectionKey === "players") {
        return buildPlayersSection(model, selectedPlayer, handlePlayerSelection)
    }
    if (sectionKey === "matchups") {
        return buildMatchupsSection({
            model,
            selectedPlayer,
            onSelectPlayer: handlePlayerSelection,
            heatmapMetricByKind,
            onHeatmapMetricChange: handleHeatmapMetricChange,
        })
    }
    if (sectionKey === "sessions") {
        return buildSessionsSection(model)
    }
    return buildOverviewSection(model)
}

function resolveSelectedPlayer(model) {
    if (selectedPlayerName && model.players.includes(selectedPlayerName)) {
        return selectedPlayerName
    }
    selectedPlayerName = model.defaultSelectedPlayer
    return selectedPlayerName
}

function handlePlayerSelection(name) {
    selectedPlayerName = name
    rerenderStats()
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

function handleSectionChange(nextSection) {
    if (selectedStatsSection === nextSection) {
        return
    }
    selectedStatsSection = nextSection
    rerenderStats()
}

function rerenderStats() {
    if (!lastRenderArgs) {
        return
    }
    renderStats(lastRenderArgs)
}

export { renderStats }
