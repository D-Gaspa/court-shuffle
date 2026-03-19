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

function createStatsSectionNav({ sections, activeKey, onSelect }) {
    const nav = createEl("nav", "stats-subnav")
    nav.setAttribute("aria-label", "Stats sections")
    for (const section of sections) {
        const button = createEl(
            "button",
            `stats-subnav-btn${section.key === activeKey ? " is-active" : ""}`,
            section.label,
        )
        button.type = "button"
        button.setAttribute("aria-pressed", String(section.key === activeKey))
        button.addEventListener("click", () => onSelect(section.key))
        nav.appendChild(button)
    }
    return nav
}

function createBriefingHero(globalStats) {
    const hero = createEl("section", "stats-hero stats-hero-dossier stagger-1")
    hero.appendChild(createHeroBackdrop())

    const content = createEl("div", "stats-hero-layout")
    const intro = createEl("div", "stats-hero-intro")
    intro.appendChild(createEl("p", "stats-kicker", "Scouting Dossier"))
    intro.appendChild(createEl("h2", "stats-hero-headline", buildHeroHeadline(globalStats.queryMeta)))
    intro.appendChild(
        createEl(
            "p",
            "stats-hero-copy",
            `A tactical snapshot of ${globalStats.queryMeta.filteredSessionCount} saved sessions, ${globalStats.playedMatchCount} scored matches, and ${globalStats.decidedMatchCount} decided outcomes.`,
        ),
    )
    content.appendChild(intro)
    content.appendChild(createHeroCounts(globalStats))
    hero.appendChild(content)
    hero.appendChild(createHeroTrustStrip(globalStats))
    return hero
}

function createHeroBackdrop() {
    const deco = createEl("div", "stats-hero-deco")
    deco.appendChild(createEl("span", "stats-orb stats-orb-clay"))
    deco.appendChild(createEl("span", "stats-orb stats-orb-court"))
    deco.appendChild(createEl("span", "stats-line stats-line-a"))
    deco.appendChild(createEl("span", "stats-line stats-line-b"))
    deco.appendChild(createEl("span", "stats-dossier-grid"))
    return deco
}

function buildHeroHeadline(queryMeta) {
    const playerChip = queryMeta.activeChips.find((chip) => chip.startsWith("Player: "))
    if (playerChip) {
        return `${playerChip.replace("Player: ", "")} briefing`
    }
    return "Crew briefing"
}

function createHeroCounts(globalStats) {
    const grid = createEl("div", "stats-hero-counts")
    grid.appendChild(
        createHeroStat(
            "Sessions",
            String(globalStats.queryMeta.filteredSessionCount),
            globalStats.queryMeta.shortTimeLabel,
        ),
    )
    grid.appendChild(createHeroStat("Scored", String(globalStats.playedMatchCount), "Scored matches"))
    grid.appendChild(createHeroStat("Decided", String(globalStats.decidedMatchCount), "Decided only"))
    grid.appendChild(
        createHeroStat(
            "Coverage",
            `${globalStats.rosterCoverage.filtered}/${globalStats.rosterCoverage.total}`,
            "Players in scope",
        ),
    )
    return grid
}

function createHeroStat(label, value, meta) {
    const card = createEl("div", "stats-hero-stat")
    card.appendChild(createEl("span", "stats-hero-stat-label", label))
    card.appendChild(createEl("strong", "stats-hero-stat-value", value))
    card.appendChild(createEl("span", "stats-hero-stat-meta", meta))
    return card
}

function createHeroTrustStrip(globalStats) {
    const strip = createEl("div", "stats-hero-strip")
    const chips = [
        globalStats.queryMeta.shortTimeLabel,
        "Active history only",
        "Decided matches only",
        `${globalStats.uniquePlayerCount} players in query`,
    ]
    for (const chip of chips) {
        strip.appendChild(createEl("span", "stats-trust-chip", chip))
    }
    return strip
}

function createGlobalHighlightsPanel(globalStats) {
    const section = createEl("section", "stats-panel stats-panel-highlights stagger-2")
    section.appendChild(createPanelHeader("Signals", "Thresholded snapshots from the current scouting query"))
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
    section.appendChild(
        createPanelHeader("Leaderboards", "Small samples are called out; rankings use only in-scope sessions"),
    )
    const grid = createEl("div", "stats-columns")
    grid.appendChild(
        createLeaderboardList({
            title: "Most Wins",
            rows: globalStats.leaders.leaderboards.mostWins,
            valueFormatter: (row) => `${row.wins}W`,
            metaFormatter: (row) => `${row.decidedMatches} decided matches`,
        }),
    )
    grid.appendChild(
        createLeaderboardList({
            title: "Best Win Rate",
            rows: globalStats.leaders.leaderboards.bestWinRate,
            valueFormatter: (row) => formatPercent(row.winRate),
            metaFormatter: (row) => `${row.decidedMatches} decided matches`,
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
            metaFormatter: (row) => `${row.decidedMatches} decided matches`,
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

export { createBriefingHero, createGlobalHighlightsPanel, createGlobalLeaderboardsPanel, createStatsSectionNav }
