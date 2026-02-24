import { formatPercent, formatRecord, formatSignedNumber } from "./format.js"

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

function createScopeFilterPanel({ options, selectedKey, scopeMeta, onSelect }) {
    const section = createEl("section", "stats-panel stats-scope-panel stagger-1")
    const top = createEl("div", "stats-scope-header")
    const titleWrap = createEl("div", "")
    titleWrap.appendChild(createEl("h3", "stats-panel-title", "Time Window"))
    titleWrap.appendChild(createEl("p", "stats-panel-subtitle", "Switch between all-time and recent history"))
    top.appendChild(titleWrap)
    top.appendChild(
        createEl("span", "stats-scope-meta", `${scopeMeta.sessionCount}/${scopeMeta.totalSessionCount} sessions`),
    )
    section.appendChild(top)
    const controls = createEl("div", "stats-toggle-row")
    for (const option of options) {
        controls.appendChild(createToggleButton(option, option.key === selectedKey, onSelect))
    }
    section.appendChild(controls)
    return section
}

function createToggleButton(option, selected, onSelect) {
    const button = createEl("button", `stats-toggle-btn${selected ? " is-selected" : ""}`, option.label)
    button.type = "button"
    button.setAttribute("aria-pressed", String(selected))
    button.addEventListener("click", () => onSelect(option.key))
    return button
}

function createGlobalHighlightsPanel(globalStats) {
    const section = createEl("section", "stats-panel stats-panel-highlights stagger-2")
    section.appendChild(createPanelHeader("Global Highlights", `${globalStats.scope.label} leaderboard snapshots`))
    const grid = createEl("div", "stats-highlight-grid")
    for (const highlight of globalStats.leaders.highlights) {
        grid.appendChild(createHighlightCard(highlight))
    }
    section.appendChild(grid)
    return section
}

function createHighlightCard(highlight) {
    const card = createEl("div", "stats-highlight-card")
    card.appendChild(createEl("span", "stats-highlight-label", highlight.label))
    card.appendChild(createEl("strong", "stats-highlight-value", highlight.value))
    card.appendChild(createEl("div", "stats-highlight-player", highlight.playerName || "No qualifier yet"))
    card.appendChild(createEl("span", "stats-highlight-meta", highlight.meta))
    return card
}

function createGlobalLeaderboardsPanel(globalStats) {
    const section = createEl("section", "stats-panel stats-panel-leaderboards stagger-3")
    section.appendChild(createPanelHeader("Global Leaderboards", "Best performers in the selected window"))
    const grid = createEl("div", "stats-columns")
    grid.appendChild(
        createLeaderboardList({
            title: "Most Wins",
            rows: globalStats.leaders.leaderboards.mostWins,
            valueFormatter: (row) => `${row.wins}W`,
            metaFormatter: (row) => `${row.decidedMatches} matches`,
        }),
    )
    grid.appendChild(
        createLeaderboardList({
            title: "Best Win Rate",
            rows: globalStats.leaders.leaderboards.bestWinRate,
            valueFormatter: (row) => formatPercent(row.winRate),
            metaFormatter: (row) => `${row.decidedMatches} matches`,
        }),
    )
    grid.appendChild(
        createLeaderboardList({
            title: "Most Matches",
            rows: globalStats.leaders.leaderboards.mostMatches,
            valueFormatter: (row) => `${row.decidedMatches}M`,
            metaFormatter: (row) => formatRecord(row.wins, row.losses),
        }),
    )
    grid.appendChild(
        createLeaderboardList({
            title: "Best Avg Diff",
            rows: globalStats.leaders.leaderboards.bestAvgDiff,
            valueFormatter: (row) => formatSignedNumber(row.avgGameDiff),
            metaFormatter: (row) => `${row.decidedMatches} matches`,
        }),
    )
    section.appendChild(grid)
    return section
}

function createLeaderboardList(config) {
    const wrap = createEl("div", "stats-subpanel")
    wrap.appendChild(createEl("h4", "stats-subpanel-title", config.title))
    if (!config.rows || config.rows.length === 0) {
        wrap.appendChild(createEl("p", "stats-relationship-empty", "No qualifying players yet."))
        return wrap
    }
    const list = createEl("ol", "stats-mini-list")
    for (const row of config.rows) {
        list.appendChild(createLeaderboardRow(row, config.valueFormatter, config.metaFormatter))
    }
    wrap.appendChild(list)
    return wrap
}

function createLeaderboardRow(row, valueFormatter, metaFormatter) {
    const item = createEl("li", "stats-mini-row")
    item.appendChild(createEl("span", "stats-mini-name", row.name))
    item.appendChild(createEl("span", "stats-mini-value", valueFormatter(row)))
    item.appendChild(createEl("span", "stats-mini-meta", metaFormatter(row)))
    return item
}

function createPanelHeader(title, subtitle) {
    const header = createEl("div", "stats-panel-header")
    header.appendChild(createEl("h3", "stats-panel-title", title))
    header.appendChild(createEl("p", "stats-panel-subtitle", subtitle))
    return header
}

export { createScopeFilterPanel, createGlobalHighlightsPanel, createGlobalLeaderboardsPanel }
