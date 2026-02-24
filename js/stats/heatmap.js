import { formatPercent } from "./format.js"

const LABEL_WORD_SPLIT_RE = /\s+/
const HEAT_PRECISION_DIGITS = 3
const HEAT_BASELINE = 0.1
const HEAT_RANGE = 0.9
const COMPACT_NAME_MAX_LENGTH = 10
const COMPACT_NAME_SLICE_LENGTH = 9
const INITIALS_WORD_LIMIT = 2
const HEATMAP_METRICS = [
    { key: "frequency", label: "Frequency" },
    { key: "winRate", label: "Win Rate" },
]

function createEl(tag, className, text) {
    const el = document.createElement(tag)
    if (className) {
        el.className = className
    }
    if (text !== undefined) {
        el.textContent = text
    }
    return el
}

function buildHeatmapCard({ kind, title, subtitle, heatmapSet, selectedPlayer, metricKey, onMetricChange }) {
    const activeMetric = heatmapSet[metricKey] ? metricKey : HEATMAP_METRICS[0].key
    const section = createEl("section", "stats-panel stats-panel-heatmap stagger-5")
    section.appendChild(buildHeader(title, subtitle, activeMetric, onMetricChange))
    section.appendChild(
        buildHeatmapScroller({
            title,
            heatmap: heatmapSet[activeMetric],
            selectedPlayer,
            kind,
            metricKey: activeMetric,
        }),
    )
    return section
}

function buildHeader(title, subtitle, activeMetric, onMetricChange) {
    const header = createEl("div", "stats-panel-header")
    header.appendChild(createEl("h3", "stats-panel-title", title))
    header.appendChild(createEl("p", "stats-panel-subtitle", subtitle))
    header.appendChild(buildMetricToggle(activeMetric, onMetricChange))
    return header
}

function buildMetricToggle(activeMetric, onMetricChange) {
    const wrap = createEl("div", "stats-toggle-row stats-toggle-row-compact")
    for (const metric of HEATMAP_METRICS) {
        const button = createEl(
            "button",
            `stats-toggle-btn${metric.key === activeMetric ? " is-selected" : ""}`,
            metric.label,
        )
        button.type = "button"
        button.setAttribute("aria-pressed", String(metric.key === activeMetric))
        button.addEventListener("click", () => onMetricChange(metric.key))
        wrap.appendChild(button)
    }
    return wrap
}

function buildHeatmapScroller(config) {
    const scroller = createEl("div", "stats-heatmap-scroller")
    scroller.appendChild(buildHeatmapTable(config))
    return scroller
}

function buildHeatmapTable({ title, heatmap, selectedPlayer, kind, metricKey }) {
    const table = createEl("table", "stats-heatmap-table")
    const caption = createEl("caption", "stats-sr-only", `${title} ${metricKey} heatmap`)
    table.appendChild(caption)
    table.appendChild(buildHeadRow(heatmap.players, selectedPlayer))
    table.appendChild(buildBodyRows(heatmap, selectedPlayer, kind, metricKey))
    return table
}

function buildHeadRow(players, selectedPlayer) {
    const thead = document.createElement("thead")
    const row = document.createElement("tr")
    row.appendChild(createEl("th", "stats-heatmap-corner", ""))
    for (const player of players) {
        row.appendChild(buildHeaderCell(player, selectedPlayer === player))
    }
    thead.appendChild(row)
    return thead
}

function buildHeaderCell(name, selected) {
    const th = createEl("th", "stats-heatmap-header")
    if (selected) {
        th.classList.add("is-selected")
    }
    th.scope = "col"
    th.textContent = compactLabel(name)
    th.title = name
    return th
}

function buildBodyRows(heatmap, selectedPlayer, kind, metricKey) {
    const tbody = document.createElement("tbody")
    for (let rowIndex = 0; rowIndex < heatmap.players.length; rowIndex += 1) {
        tbody.appendChild(buildBodyRow({ heatmap, rowIndex, selectedPlayer, kind, metricKey }))
    }
    return tbody
}

function buildBodyRow({ heatmap, rowIndex, selectedPlayer, kind, metricKey }) {
    const row = document.createElement("tr")
    const rowPlayer = heatmap.players[rowIndex]
    row.appendChild(buildRowLabel(rowPlayer, selectedPlayer === rowPlayer))
    for (let colIndex = 0; colIndex < heatmap.players.length; colIndex += 1) {
        row.appendChild(buildValueCell({ heatmap, rowIndex, colIndex, selectedPlayer, kind, metricKey }))
    }
    return row
}

function buildRowLabel(name, selected) {
    const th = createEl("th", "stats-heatmap-row-header")
    if (selected) {
        th.classList.add("is-selected")
    }
    th.scope = "row"
    th.textContent = compactLabel(name)
    th.title = name
    return th
}

function buildValueCell({ heatmap, rowIndex, colIndex, selectedPlayer, kind, metricKey }) {
    const td = createEl("td", "stats-heatmap-cell")
    const rowPlayer = heatmap.players[rowIndex]
    const colPlayer = heatmap.players[colIndex]
    if (rowPlayer === colPlayer) {
        td.classList.add("is-diagonal")
        td.textContent = "—"
        return td
    }
    if (rowPlayer === selectedPlayer || colPlayer === selectedPlayer) {
        td.classList.add("is-selected-axis")
    }
    const value = heatmap.matrix[rowIndex][colIndex]
    if (metricKey === "winRate") {
        paintWinRateCell(td, value)
        td.textContent = typeof value === "number" ? formatPercent(value) : "—"
    } else {
        paintCountCell(td, value, heatmap.max)
        td.textContent = String(value ?? 0)
    }
    td.title = buildCellTitle({ heatmap, rowPlayer, colPlayer, rowIndex, colIndex, kind, metricKey, value })
    return td
}

function paintCountCell(td, value, max) {
    const numeric = typeof value === "number" ? value : 0
    td.classList.add("metric-count")
    td.style.setProperty("--heat", getHeatIntensity(numeric, max).toFixed(HEAT_PRECISION_DIGITS))
}

function paintWinRateCell(td, value) {
    td.classList.add("metric-win-rate")
    if (typeof value !== "number") {
        td.classList.add("is-no-data")
        return
    }
    td.style.setProperty("--win-rate", value.toFixed(HEAT_PRECISION_DIGITS))
}

function buildCellTitle({ heatmap, rowPlayer, colPlayer, rowIndex, colIndex, kind, metricKey, value }) {
    if (metricKey === "winRate") {
        const sampleCount = heatmap.sampleMatrix?.[rowIndex]?.[colIndex] ?? 0
        const valueText = typeof value === "number" ? formatPercent(value) : "No decided matches"
        const perspective =
            kind === "opponent" ? `${rowPlayer} win rate vs ${colPlayer}` : `${rowPlayer} & ${colPlayer}`
        return `${perspective}: ${valueText} (${sampleCount} decided matches)`
    }
    return `${rowPlayer} × ${colPlayer}: ${value ?? 0} scored matches`
}

function getHeatIntensity(value, max) {
    if (!max || value <= 0) {
        return 0
    }
    return HEAT_BASELINE + (value / max) * HEAT_RANGE
}

function compactLabel(name) {
    const trimmed = name.trim()
    if (trimmed.length <= COMPACT_NAME_MAX_LENGTH) {
        return trimmed
    }
    const parts = trimmed.split(LABEL_WORD_SPLIT_RE).filter(Boolean)
    if (parts.length > 1) {
        return parts
            .slice(0, INITIALS_WORD_LIMIT)
            .map((part) => part[0])
            .join("")
            .toUpperCase()
    }
    return `${trimmed.slice(0, COMPACT_NAME_SLICE_LENGTH)}…`
}

export { buildHeatmapCard }
