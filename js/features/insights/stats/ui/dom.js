import { formatCountLabel, formatPercent, formatRecord, formatSignedNumber } from "./format.js"

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

function createViewHeader() {
    const header = createEl("div", "view-header stats-view-header")
    header.appendChild(createEl("h1", "", "Scouting Dossier"))
    header.appendChild(createEl("p", "", "Filter once. Read the whole crew like a match briefing."))
    return header
}

function createEmptyState({ title, subtitle, icon }) {
    const wrap = createEl("div", "stats-empty-shell")
    const state = createEl("div", "empty-state stats-empty-state")
    const iconWrap = createEl("div", "empty-icon stats-empty-icon")
    iconWrap.appendChild(icon)
    state.appendChild(iconWrap)
    state.appendChild(createEl("p", "", title))
    state.appendChild(createEl("span", "", subtitle))
    wrap.appendChild(state)
    return wrap
}

function createStatsIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", "0 0 24 24")
    svg.setAttribute("fill", "none")
    svg.setAttribute("stroke", "currentColor")
    svg.setAttribute("stroke-width", "1.8")
    svg.setAttribute("stroke-linecap", "round")
    const paths = [
        ["path", { d: "M4 19h16" }],
        ["path", { d: "M7 15V9" }],
        ["path", { d: "M12 15V5" }],
        ["path", { d: "M17 15v-3" }],
        ["circle", { cx: "17", cy: "8", r: "2" }],
    ]
    for (const [tag, attrs] of paths) {
        const node = document.createElementNS("http://www.w3.org/2000/svg", tag)
        for (const [name, value] of Object.entries(attrs)) {
            node.setAttribute(name, value)
        }
        svg.appendChild(node)
    }
    return svg
}

function createShell() {
    const shell = createEl("div", "stats-shell")
    shell.appendChild(createViewHeader())
    return shell
}

function createPlayerSummaryPanel(playerName, summary, queryLabel) {
    const section = createEl("section", "stats-panel stats-panel-summary")
    section.appendChild(createPanelHeader(playerName, `${queryLabel} · decided matches only`))
    const grid = createEl("div", "stats-summary-grid")
    grid.appendChild(createMetricCard("Win Rate", formatPercent(summary.winRate), "Competitive edge"))
    grid.appendChild(createMetricCard("Record", formatRecord(summary.wins, summary.losses), "Wins-Losses"))
    grid.appendChild(createMetricCard("Avg Game Diff", formatSignedNumber(summary.avgGameDiff), "Per decided match"))
    grid.appendChild(createMetricCard("Matches", String(summary.decidedMatches), "Based on decided matches"))
    section.appendChild(grid)
    return section
}

function createMetricCard(label, value, caption) {
    const card = createEl("div", "stats-metric-card")
    card.appendChild(createEl("span", "stats-metric-label", label))
    card.appendChild(createEl("strong", "stats-metric-value", value))
    card.appendChild(createEl("span", "stats-metric-caption", caption))
    return card
}

function createRelationshipList(rows, className = "stats-relationship-list") {
    const list = createEl("ol", className)
    for (const row of rows) {
        list.appendChild(createRelationshipRow(row))
    }
    return list
}

function createRelationshipRow(row) {
    const item = createEl("li", "stats-relationship-row")
    const top = createEl("div", "stats-relationship-name")
    top.appendChild(createEl("strong", "stats-relationship-player", row.name))
    top.appendChild(createEl("span", "", formatCountLabel(row.matches, "match")))
    const meta = createEl("div", "stats-relationship-meta")
    if (Number.isFinite(row.chemistryScore)) {
        meta.appendChild(createTrustPill(`Chem ${row.chemistryScore}`))
    }
    meta.appendChild(createTrustPill(formatPercent(row.winRate)))
    meta.appendChild(createTrustPill(formatRecord(row.wins, row.losses)))
    meta.appendChild(createTrustPill(formatSignedNumber(row.avgGameDiff)))
    meta.appendChild(createTrustPill(`Based on ${row.matches}`))
    if (row.isSmallSample) {
        meta.appendChild(createTrustPill("Small sample", "is-warning"))
    }
    item.appendChild(top)
    item.appendChild(meta)
    return item
}

function createMatchupTablePanel(config) {
    const section = createEl("section", `stats-panel stats-panel-relationship ${config.toneClass}`)
    section.appendChild(createPanelHeader(config.title, config.subtitle))
    const meta = createEl("div", "stats-table-meta")
    meta.appendChild(createTrustPill(`${config.rows.length} results`))
    meta.appendChild(createTrustPill("Decided matches only"))
    if (config.rows.some((row) => row.isSmallSample)) {
        meta.appendChild(createTrustPill("Small samples flagged", "is-warning"))
    }
    section.appendChild(meta)
    if (config.rows.length === 0) {
        section.appendChild(createEl("p", "stats-relationship-empty", config.emptyMessage))
        return section
    }
    section.appendChild(createRelationshipList(config.rows))
    return section
}

function createSessionTablePanel(config) {
    const section = createEl("section", "stats-panel")
    section.appendChild(createPanelHeader(config.title, config.subtitle))
    if (config.rows.length === 0) {
        section.appendChild(createEl("p", "stats-relationship-empty", config.emptyMessage))
        return section
    }
    const list = createEl("ol", "stats-mini-list")
    for (const row of config.rows) {
        const item = createEl("li", "stats-mini-row")
        item.appendChild(createEl("span", "stats-mini-name", row.name))
        item.appendChild(createEl("span", "stats-mini-value", config.valueFormatter(row)))
        item.appendChild(createEl("span", "stats-mini-meta", row.meta))
        list.appendChild(item)
    }
    section.appendChild(list)
    return section
}

function createSessionResumePanel(cards) {
    const section = createEl("section", "stats-panel")
    section.appendChild(createPanelHeader("Tournament Resume", "Only uses fields already saved in session history."))
    const grid = createEl("div", "stats-summary-grid")
    for (const card of cards) {
        grid.appendChild(createMetricCard(card.label, card.value, card.meta))
    }
    section.appendChild(grid)
    return section
}

function createRecapFactsPanel(facts) {
    const section = createEl("section", "stats-panel")
    section.appendChild(createPanelHeader("Recap Facts", "Quick truths pulled from the filtered session set."))
    if (facts.length === 0) {
        section.appendChild(createEl("p", "stats-relationship-empty", "No recap facts available yet."))
        return section
    }
    const list = createEl("div", "stats-fact-list")
    for (const fact of facts) {
        const item = createEl("div", "stats-fact-row")
        item.appendChild(createEl("span", "stats-fact-label", fact.label))
        item.appendChild(createEl("strong", "stats-fact-value", fact.value))
        item.appendChild(createEl("span", "stats-fact-meta", fact.meta))
        list.appendChild(item)
    }
    section.appendChild(list)
    return section
}

function createPanelHeader(title, subtitle) {
    const header = createEl("div", "stats-panel-header")
    header.appendChild(createEl("h3", "stats-panel-title", title))
    if (subtitle) {
        header.appendChild(createEl("p", "stats-panel-subtitle", subtitle))
    }
    return header
}

function createTrustPill(text, toneClass = "") {
    return createEl("span", `stats-pill${toneClass ? ` ${toneClass}` : ""}`, text)
}

export {
    createEl,
    createPanelHeader,
    createEmptyState,
    createMatchupTablePanel,
    createPlayerSummaryPanel,
    createRecapFactsPanel,
    createSessionResumePanel,
    createSessionTablePanel,
    createShell,
    createStatsIcon,
    createTrustPill,
}
