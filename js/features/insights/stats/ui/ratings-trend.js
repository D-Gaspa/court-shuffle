import { createPanelHeader, createTrustPill } from "./dom.js"
import { formatInteger } from "./format.js"
import { createTrendGroupingToggle } from "./ratings-trend-controls.js"
import {
    buildDisplayPoints,
    resolveHorizontalAxisAnchor,
    resolveHorizontalAxisLabelIndexes,
} from "./ratings-trend-points.js"

const CHART_HEIGHT = 220
const CHART_WIDTH = 360
const MIN_TREND_PADDING = 8
const FALLBACK_TREND_SPREAD = 12
const TREND_PADDING_RATIO = 0.18
const AXIS_LABEL_X_OFFSET = 10
const AXIS_LABEL_Y_OFFSET = 4
const CHART_BOUNDS = {
    left: 52,
    right: 332,
    top: 18,
    bottom: 172,
}
const AXIS_TICK_COUNT = 4
const TOOLTIP_HORIZONTAL_PADDING = 12
const TOOLTIP_VERTICAL_OFFSET = 14
const TOOLTIP_MAX_WIDTH = 140
const X_AXIS_LABEL_OFFSET = 18
const xAxisLabelY = CHART_BOUNDS.bottom + X_AXIS_LABEL_OFFSET

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

function createTrendPanel({
    isArchivedView,
    ladder,
    onSelectTrendGrouping,
    selectedPlayer,
    season,
    selectedMode,
    selectedTrendGrouping,
}) {
    const player = ladder.players[selectedPlayer]
    const section = createEl("section", "stats-panel stats-panel-ratings-trend")
    section.appendChild(
        createPanelHeader(
            `${selectedPlayer} trendline`,
            `${season.label} · ${selectedMode === "singles" ? "Singles" : "Doubles"} ladder progression`,
        ),
    )
    if (isArchivedView || !Array.isArray(player.trend) || player.trend.length === 0) {
        section.appendChild(
            createEl(
                "p",
                "stats-relationship-empty",
                "Trendline points are only available for the active season replay. Archived seasons preserve final snapshots instead.",
            ),
        )
        return section
    }
    section.appendChild(createTrendGroupingToggle(selectedTrendGrouping, onSelectTrendGrouping))
    section.appendChild(createTrendChart(player.trend, selectedTrendGrouping))
    const footer = createEl("div", "stats-ratings-trend-meta")
    footer.appendChild(createTrustPill(`Start ${formatInteger(player.trend[0]?.rating)}`))
    footer.appendChild(createTrustPill(`Current ${formatInteger(player.rating)}`))
    footer.appendChild(createTrustPill(`High ${formatInteger(player.seasonHigh)}`))
    footer.appendChild(createTrustPill(`Low ${formatInteger(player.seasonLow)}`))
    section.appendChild(footer)
    return section
}

function createTrendChart(rawPoints, grouping = "match") {
    const points = buildDisplayPoints(rawPoints, grouping)
    const chart = createEl("div", "stats-ratings-trend-chart")
    const plot = createEl("div", "stats-ratings-trend-plot")
    const tooltip = createEl("div", "stats-ratings-trend-tooltip")
    tooltip.hidden = true
    plot.appendChild(tooltip)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`)
    svg.setAttribute("class", "stats-ratings-trend-svg")
    const geometry = buildTrendGeometry(points)
    appendTrendAxis(svg, geometry)
    appendTrendData(svg, geometry, tooltip, plot)
    plot.appendChild(svg)
    chart.appendChild(plot)
    chart.appendChild(createTrendRangeLabels(geometry))
    return chart
}

function buildTrendGeometry(points) {
    const values = points.map((point) => point.rating)
    const rawMinValue = Math.min(...values)
    const rawMaxValue = Math.max(...values)
    const padding = Math.max(
        MIN_TREND_PADDING,
        Math.ceil((rawMaxValue - rawMinValue || FALLBACK_TREND_SPREAD) * TREND_PADDING_RATIO),
    )
    const minValue = rawMinValue - padding
    const maxValue = rawMaxValue + padding
    const range = Math.max(1, maxValue - minValue)
    const step = points.length > 1 ? (CHART_BOUNDS.right - CHART_BOUNDS.left) / (points.length - 1) : 0
    const linePoints = points.map((point, index) => {
        const x = CHART_BOUNDS.left + step * index
        const y = CHART_BOUNDS.bottom - ((point.rating - minValue) / range) * (CHART_BOUNDS.bottom - CHART_BOUNDS.top)
        const previousRating = index > 0 ? points[index - 1].rating : null
        return {
            ...point,
            index,
            delta: previousRating === null ? 0 : point.rating - previousRating,
            x,
            y,
        }
    })
    return {
        linePoints,
        maxValue,
        minValue,
        points,
        range,
    }
}

function appendTrendAxis(svg, geometry) {
    const axisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g")
    axisGroup.setAttribute("class", "stats-ratings-trend-axis")
    const ticks = buildRatingAxisTickValues(geometry.minValue, geometry.maxValue)

    for (const tick of ticks) {
        const y = projectRatingToY(tick, geometry.minValue, geometry.range)
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line")
        line.setAttribute("class", "stats-ratings-trend-gridline")
        line.setAttribute("x1", String(CHART_BOUNDS.left))
        line.setAttribute("x2", String(CHART_BOUNDS.right))
        line.setAttribute("y1", String(y))
        line.setAttribute("y2", String(y))
        axisGroup.appendChild(line)

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
        label.setAttribute("class", "stats-ratings-trend-axis-label")
        label.setAttribute("x", String(CHART_BOUNDS.left - AXIS_LABEL_X_OFFSET))
        label.setAttribute("y", String(y + AXIS_LABEL_Y_OFFSET))
        label.textContent = formatInteger(tick)
        axisGroup.appendChild(label)
    }

    const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line")
    baseline.setAttribute("class", "stats-ratings-trend-baseline")
    baseline.setAttribute("x1", String(CHART_BOUNDS.left))
    baseline.setAttribute("x2", String(CHART_BOUNDS.right))
    baseline.setAttribute("y1", String(CHART_BOUNDS.bottom))
    baseline.setAttribute("y2", String(CHART_BOUNDS.bottom))
    axisGroup.appendChild(baseline)
    appendTrendHorizontalAxisLabels(axisGroup, geometry.linePoints)
    svg.appendChild(axisGroup)
}

function appendTrendHorizontalAxisLabels(axisGroup, points) {
    const labelIndexes = resolveHorizontalAxisLabelIndexes(points)
    for (const index of labelIndexes) {
        const point = points[index]
        if (!point?.xLabel) {
            continue
        }
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
        label.setAttribute("class", "stats-ratings-trend-axis-label stats-ratings-trend-axis-label-x")
        label.setAttribute("x", String(point.x))
        label.setAttribute("y", String(xAxisLabelY))
        label.setAttribute("text-anchor", resolveHorizontalAxisAnchor(index, points))
        label.textContent = point.xLabel
        axisGroup.appendChild(label)
    }
}

function appendTrendData(svg, geometry, tooltip, plot) {
    const area = document.createElementNS("http://www.w3.org/2000/svg", "path")
    area.setAttribute("class", "stats-ratings-trend-area")
    area.setAttribute("d", buildAreaPath(geometry.linePoints, CHART_BOUNDS.bottom))
    svg.appendChild(area)

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
    polyline.setAttribute("class", "stats-ratings-trend-line")
    polyline.setAttribute("points", geometry.linePoints.map((point) => `${point.x},${point.y}`).join(" "))
    svg.appendChild(polyline)

    for (const point of geometry.linePoints) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
        circle.setAttribute("class", "stats-ratings-trend-point")
        circle.setAttribute("cx", String(point.x))
        circle.setAttribute("cy", String(point.y))
        circle.setAttribute("r", "4")
        circle.addEventListener("mouseenter", () => showTrendTooltip({ plot, point, tooltip }))
        circle.addEventListener("mousemove", () => showTrendTooltip({ plot, point, tooltip }))
        circle.addEventListener("mouseleave", () => hideTrendTooltip(tooltip))
        svg.appendChild(circle)
    }
    svg.addEventListener("mouseleave", () => hideTrendTooltip(tooltip))
}

function createTrendRangeLabels(geometry) {
    const labels = createEl("div", "stats-ratings-trend-labels")
    labels.appendChild(
        createEl("span", "stats-ratings-trend-label", `Start ${formatInteger(geometry.points[0]?.rating)}`),
    )
    labels.appendChild(
        createEl("span", "stats-ratings-trend-label", `Current ${formatInteger(geometry.points.at(-1)?.rating)}`),
    )
    return labels
}

function buildRatingAxisTickValues(minValue, maxValue) {
    if (minValue === maxValue) {
        return [minValue]
    }
    const ticks = []
    for (let index = 0; index < AXIS_TICK_COUNT; index += 1) {
        const ratio = index / (AXIS_TICK_COUNT - 1)
        ticks.push(Math.round(maxValue - ratio * (maxValue - minValue)))
    }
    return ticks
}

function projectRatingToY(rating, minValue, range) {
    return CHART_BOUNDS.bottom - ((rating - minValue) / range) * (CHART_BOUNDS.bottom - CHART_BOUNDS.top)
}

function showTrendTooltip({ plot, point, tooltip }) {
    tooltip.hidden = false
    tooltip.textContent = ""
    tooltip.appendChild(createEl("strong", "stats-ratings-trend-tooltip-title", point.tooltipTitle))
    tooltip.appendChild(createEl("span", "", `Rating ${formatInteger(point.rating)}`))
    tooltip.appendChild(createEl("span", "", describePointDelta(point)))
    if (Number.isFinite(point.sessionMatchCount)) {
        tooltip.appendChild(
            createEl("span", "", `${point.sessionMatchCount} rated match${point.sessionMatchCount === 1 ? "" : "es"}`),
        )
    }
    if (point.tooltipDate) {
        tooltip.appendChild(createEl("span", "", point.tooltipDate))
    }

    const plotRect = plot.getBoundingClientRect()
    const horizontalPadding = TOOLTIP_HORIZONTAL_PADDING
    const verticalOffset = TOOLTIP_VERTICAL_OFFSET
    const left = Math.max(
        horizontalPadding,
        Math.min((point.x / CHART_WIDTH) * plotRect.width, plotRect.width - TOOLTIP_MAX_WIDTH),
    )
    const top = Math.max(horizontalPadding, (point.y / CHART_HEIGHT) * plotRect.height - verticalOffset)
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
}

function hideTrendTooltip(tooltip) {
    tooltip.hidden = true
}

function describePointDelta(point) {
    if (point.index === 0) {
        return "Season baseline"
    }
    return `${point.delta > 0 ? "+" : ""}${formatInteger(point.delta)} from prior point`
}

function buildAreaPath(points, bottom) {
    if (points.length === 0) {
        return ""
    }
    const [first] = points
    const last = points.at(-1)
    const segments = [`M ${first.x} ${bottom}`, `L ${first.x} ${first.y}`]
    for (let index = 1; index < points.length; index += 1) {
        segments.push(`L ${points[index].x} ${points[index].y}`)
    }
    segments.push(`L ${last.x} ${bottom}`, "Z")
    return segments.join(" ")
}

export { createTrendPanel }
