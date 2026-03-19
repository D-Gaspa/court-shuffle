import {
    createMatchupTablePanel,
    createPlayerSummaryPanel,
    createRecapFactsPanel,
    createSessionResumePanel,
    createSessionTablePanel,
} from "./dom.js"
import { buildHeatmapCard } from "./heatmap.js"
import { createBriefingHero, createGlobalHighlightsPanel, createGlobalLeaderboardsPanel } from "./overview.js"
import { createCompactPlayerSwitcher, createPlayerListPanel } from "./player-list.js"

function buildOverviewSection(model) {
    const wrap = document.createElement("div")
    wrap.className = "stats-section-grid"
    wrap.appendChild(createBriefingHero(model.global))
    wrap.appendChild(createGlobalHighlightsPanel(model.global))
    wrap.appendChild(createGlobalLeaderboardsPanel(model.global))
    return wrap
}

function buildPlayersSection(model, selectedPlayer, onSelectPlayer) {
    const wrap = document.createElement("div")
    wrap.className = "stats-section-grid"
    wrap.appendChild(createPlayerListPanel(model.players, selectedPlayer, model.playerSummariesByName, onSelectPlayer))
    wrap.appendChild(
        createPlayerSummaryPanel(
            selectedPlayer,
            model.playerSummariesByName[selectedPlayer],
            model.global.queryMeta.shortTimeLabel,
        ),
    )
    return wrap
}

function buildMatchupsSection({ model, selectedPlayer, onSelectPlayer, heatmapMetricByKind, onHeatmapMetricChange }) {
    const wrap = document.createElement("div")
    wrap.className = "stats-section-grid"
    wrap.appendChild(createCompactPlayerSwitcher(model.players, selectedPlayer, onSelectPlayer))
    wrap.appendChild(buildHeatmaps(model, selectedPlayer, heatmapMetricByKind, onHeatmapMetricChange))
    const partnerRows = model.relationshipsByPlayer.partners[selectedPlayer]
    const opponentRows = model.relationshipsByPlayer.opponents[selectedPlayer]
    const tables = document.createElement("div")
    tables.className = "stats-columns"
    tables.appendChild(
        createMatchupTablePanel({
            title: "Chemistry Table",
            subtitle: `${selectedPlayer}'s best in-scope partnerships`,
            rows: partnerRows,
            emptyMessage: "No partner chemistry rows in this scope yet.",
            toneClass: "stats-tone-court",
        }),
    )
    tables.appendChild(
        createMatchupTablePanel({
            title: "Rivalry Table",
            subtitle: `${selectedPlayer}'s hardest opponent pairings`,
            rows: opponentRows,
            emptyMessage: "No rivalry rows in this scope yet.",
            toneClass: "stats-tone-clay",
        }),
    )
    wrap.appendChild(tables)
    return wrap
}

function buildSessionsSection(model) {
    const wrap = document.createElement("div")
    wrap.className = "stats-section-grid"
    const rows = document.createElement("div")
    rows.className = "stats-columns"
    rows.appendChild(
        createSessionTablePanel({
            title: "Attendance",
            subtitle: "How often each player appears in the filtered session set.",
            rows: model.sessionInsights.attendanceRows,
            emptyMessage: "No attendance data in this scope yet.",
            valueFormatter: (row) => `${row.sessionCount}`,
        }),
    )
    rows.appendChild(
        createSessionTablePanel({
            title: "Sit-Out Log",
            subtitle: "Counts direct player sit-outs only; team-ID byes stay excluded.",
            rows: model.sessionInsights.sitOutRows,
            emptyMessage: "No sit-outs recorded in this scope.",
            valueFormatter: (row) => `${row.sitOutCount}`,
        }),
    )
    wrap.appendChild(rows)
    wrap.appendChild(createSessionResumePanel(model.sessionInsights.resumeCards))
    wrap.appendChild(createRecapFactsPanel(model.sessionInsights.facts))
    return wrap
}

function buildHeatmaps(model, selectedPlayer, heatmapMetricByKind, onHeatmapMetricChange) {
    const wrap = document.createElement("div")
    wrap.className = "stats-heatmap-grid"
    wrap.appendChild(
        buildHeatmapCardForKind({
            kind: "partner",
            labelPrefix: "Partner",
            model,
            selectedPlayer,
            heatmapMetricByKind,
            onHeatmapMetricChange,
        }),
    )
    wrap.appendChild(
        buildHeatmapCardForKind({
            kind: "opponent",
            labelPrefix: "Opponent",
            model,
            selectedPlayer,
            heatmapMetricByKind,
            onHeatmapMetricChange,
        }),
    )
    return wrap
}

function buildHeatmapCardForKind({
    kind,
    labelPrefix,
    model,
    selectedPlayer,
    heatmapMetricByKind,
    onHeatmapMetricChange,
}) {
    const metricKey = heatmapMetricByKind[kind] || "frequency"
    return buildHeatmapCard({
        kind,
        title: `${labelPrefix} Matrix`,
        subtitle:
            kind === "partner"
                ? "Pair chemistry, frequency, and average score margin"
                : "Head-to-head volume, win rate, and average score margin",
        heatmapSet: model.heatmaps[kind],
        selectedPlayer,
        metricKey,
        onMetricChange: onHeatmapMetricChange(kind),
    })
}

export { buildMatchupsSection, buildOverviewSection, buildPlayersSection, buildSessionsSection }
