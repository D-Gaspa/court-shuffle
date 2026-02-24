import { formatCountLabel, formatPercent, formatRecord, formatSignedNumber } from "./format.js"

const NAME_WORD_SPLIT_RE = /\s+/

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
    header.appendChild(createEl("h1", "", "Player Stats"))
    header.appendChild(createEl("p", "", "Analytics from scored matches in your session history."))
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

function createHero(model) {
    const hero = createEl("section", "stats-hero stagger-1")
    hero.appendChild(createHeroBackdrop())
    hero.appendChild(createHeroTitle(model.global.scope))
    hero.appendChild(createHeroCounts(model.global))
    return hero
}

function createHeroBackdrop() {
    const deco = createEl("div", "stats-hero-deco")
    deco.appendChild(createEl("span", "stats-orb stats-orb-clay"))
    deco.appendChild(createEl("span", "stats-orb stats-orb-court"))
    deco.appendChild(createEl("span", "stats-line stats-line-a"))
    deco.appendChild(createEl("span", "stats-line stats-line-b"))
    return deco
}

function createHeroTitle(scope) {
    const titleWrap = createEl("div", "stats-hero-title")
    titleWrap.appendChild(createEl("p", "stats-kicker", "Scoreboard Lab"))
    titleWrap.appendChild(createEl("h2", "", "Patterns in your crew"))
    titleWrap.appendChild(
        createEl(
            "p",
            "stats-hero-copy",
            `Track who wins, who clicks, and who keeps showing up as the toughest draw (${scope.label.toLowerCase()}).`,
        ),
    )
    return titleWrap
}

function createHeroCounts(globalStats) {
    const grid = createEl("div", "stats-hero-counts")
    grid.appendChild(createHeroStat("Scored Matches", globalStats.playedMatchCount))
    grid.appendChild(createHeroStat("Decided Matches", globalStats.decidedMatchCount))
    return grid
}

function createHeroStat(label, value) {
    const card = createEl("div", "stats-hero-stat")
    card.appendChild(createEl("span", "stats-hero-stat-label", label))
    card.appendChild(createEl("strong", "stats-hero-stat-value", String(value)))
    return card
}

function createPlayerRail(players, selectedPlayer, onSelectPlayer) {
    const section = createEl("section", "stats-panel stats-panel-rail stagger-2")
    const header = createPanelHeader("Players", "Tap a card to load detail stats")
    section.appendChild(header)
    const rail = createEl("div", "stats-player-rail")
    for (const player of players) {
        rail.appendChild(createPlayerChip(player, selectedPlayer === player, onSelectPlayer))
    }
    section.appendChild(rail)
    return section
}

function createPlayerChip(name, selected, onSelectPlayer) {
    const button = createEl("button", "stats-player-chip")
    button.type = "button"
    button.classList.toggle("is-selected", selected)
    const initials = name
        .split(NAME_WORD_SPLIT_RE)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    button.appendChild(createEl("span", "stats-player-chip-avatar", initials || "?"))
    button.appendChild(createEl("span", "stats-player-chip-name", name))
    button.addEventListener("click", () => onSelectPlayer(name))
    return button
}

function createPanelHeader(title, subtitle) {
    const header = createEl("div", "stats-panel-header")
    header.appendChild(createEl("h3", "stats-panel-title", title))
    if (subtitle) {
        header.appendChild(createEl("p", "stats-panel-subtitle", subtitle))
    }
    return header
}

function createPlayerSummaryPanel(playerName, summary, scopeLabel = "Selected window") {
    const section = createEl("section", "stats-panel stats-panel-summary stagger-3")
    section.appendChild(createPanelHeader(playerName, `${scopeLabel} scored matches`))
    const grid = createEl("div", "stats-summary-grid")
    grid.appendChild(createMetricCard("Win Rate", formatPercent(summary.winRate), "Competitive edge"))
    grid.appendChild(createMetricCard("Record", formatRecord(summary.wins, summary.losses), "Wins-Losses"))
    grid.appendChild(createMetricCard("Avg Game Diff", formatSignedNumber(summary.avgGameDiff), "Per decided match"))
    grid.appendChild(createMetricCard("Matches", String(summary.decidedMatches), "Decided scored matches"))
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

function createRelationshipsPanel(config) {
    const section = createEl("section", `stats-panel stats-panel-relationship ${config.toneClass}`)
    section.appendChild(createPanelHeader(config.title, config.subtitle))
    if (!config.rows || config.rows.length === 0) {
        section.appendChild(createEl("p", "stats-relationship-empty", config.emptyMessage))
        return section
    }
    const list = createEl("ol", "stats-relationship-list")
    for (const row of config.rows) {
        list.appendChild(createRelationshipRow(row))
    }
    section.appendChild(list)
    return section
}

function createRelationshipRow(row) {
    const item = createEl("li", "stats-relationship-row")
    const nameWrap = createEl("div", "stats-relationship-name")
    nameWrap.appendChild(createEl("strong", "", row.name))
    nameWrap.appendChild(createEl("span", "", formatCountLabel(row.matches, "match")))
    const meta = createEl("div", "stats-relationship-meta")
    meta.appendChild(createEl("span", "stats-pill", formatPercent(row.winRate)))
    meta.appendChild(createEl("span", "stats-pill", formatRecord(row.wins, row.losses)))
    meta.appendChild(createEl("span", "stats-pill", formatSignedNumber(row.avgGameDiff)))
    item.appendChild(nameWrap)
    item.appendChild(meta)
    return item
}

function createRelationshipsGrid(playerName, relationships) {
    const grid = createEl("div", "stats-columns")
    const favoriteEmpty = `Need at least 2 decided matches with the same partner for ${playerName}.`
    const nemesisEmpty = `Need at least 2 decided matches against the same opponent for ${playerName}.`
    grid.appendChild(
        createRelationshipsPanel({
            title: "Favorite Partners",
            subtitle: "Ranked by win rate (min 2 matches)",
            rows: relationships.partners,
            emptyMessage: favoriteEmpty,
            toneClass: "stats-tone-court",
        }),
    )
    grid.appendChild(
        createRelationshipsPanel({
            title: "Nemesis Opponents",
            subtitle: "Worst matchups by win rate (min 2 matches)",
            rows: relationships.opponents,
            emptyMessage: nemesisEmpty,
            toneClass: "stats-tone-clay",
        }),
    )
    return grid
}

export {
    createShell,
    createHero,
    createEmptyState,
    createStatsIcon,
    createPlayerRail,
    createPlayerSummaryPanel,
    createRelationshipsGrid,
}
