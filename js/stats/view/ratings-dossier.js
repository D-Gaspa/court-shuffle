import { createPanelHeader, createTrustPill } from "./dom.js"
import { formatCountLabel, formatInteger, formatRecord, formatSignedNumber } from "./format.js"

const PERCENT_SCALE = 100

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

function createMetricCard(label, value, caption) {
    const card = createEl("div", "stats-metric-card stats-ratings-metric-card")
    card.appendChild(createEl("span", "stats-metric-label", label))
    card.appendChild(createEl("strong", "stats-metric-value", value))
    card.appendChild(createEl("span", "stats-metric-caption", caption))
    return card
}

function createDossierHighlight(label, value) {
    const item = createEl("div", "stats-ratings-dossier-highlight")
    item.appendChild(createEl("span", "stats-ratings-dossier-label", label))
    item.appendChild(createEl("strong", "stats-ratings-dossier-value", value))
    return item
}

function createDossierSummary(player) {
    const summary = createEl("div", "stats-ratings-dossier-summary")
    summary.appendChild(createDossierHighlight("Current", formatInteger(player.rating)))
    summary.appendChild(createDossierHighlight("Record", formatRecord(player.wins, player.losses)))
    summary.appendChild(
        createDossierHighlight(
            "W/R",
            player.ratedMatchCount > 0 ? `${Math.round((player.wins / player.ratedMatchCount) * PERCENT_SCALE)}%` : "—",
        ),
    )
    return summary
}

function createPlayerRatingPanel(comparisonLadder, ladder, selectedPlayer) {
    const player = ladder.players[selectedPlayer]
    const comparisonPlayer = comparisonLadder?.players?.[selectedPlayer] || null
    const liveDelta = comparisonPlayer ? player.rating - comparisonPlayer.rating : player.deltaFromStart
    const section = createEl("section", "stats-panel stats-panel-summary")
    section.appendChild(createPanelHeader(selectedPlayer, "Season rating dossier"))
    section.appendChild(createDossierSummary(player))
    const grid = createEl("div", "stats-summary-grid stats-ratings-dossier-grid")
    grid.appendChild(
        createMetricCard(
            comparisonPlayer ? "Live Delta" : "Season Delta",
            formatSignedNumber(liveDelta, 0),
            comparisonPlayer ? "Against committed season" : "From baseline",
        ),
    )
    grid.appendChild(createMetricCard("Rated Games", String(player.ratedMatchCount), "This season"))
    grid.appendChild(createMetricCard("Season High", formatInteger(player.seasonHigh), "Peak rating"))
    grid.appendChild(createMetricCard("Season Low", formatInteger(player.seasonLow), "Floor rating"))
    section.appendChild(grid)
    const chips = createEl("div", "stats-relationship-meta stats-ratings-dossier-chips")
    chips.appendChild(createTrustPill(`${formatCountLabel(player.ratedMatchCount, "game")}`))
    chips.appendChild(createTrustPill(`Trend points: ${player.trend.length}`))
    chips.appendChild(createTrustPill(comparisonPlayer ? "Live comparison active" : "Season baseline view"))
    section.appendChild(chips)
    return section
}

export { createPlayerRatingPanel }
