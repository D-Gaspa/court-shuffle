import { formatCountLabel } from "./format.js"

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

function buildRatingsHeroCopy({ activeSeason, hasLivePreview, isArchivedView, selectedPreview }) {
    if (!activeSeason) {
        return "Season-scoped ratings are off until you explicitly start a rating season."
    }
    if (isArchivedView) {
        return "Read-only archive view. Final season snapshots stay explorable without becoming active again."
    }
    if (hasLivePreview && selectedPreview === "live") {
        return "Live preview includes the provisional session already in history and emphasizes real-time ladder movement."
    }
    return "Ratings replay from saved tournament history inside the active season only."
}

function createRatingsHero({
    hasLivePreview,
    isArchivedView,
    onBackToActiveSeason,
    onStartSeason,
    ratingsModel,
    ratingsState,
    selectedMode,
    selectedPreview,
    onSelectMode,
    onSelectPreview,
}) {
    const activeSeason = ratingsModel.season
    const archivedCount = (ratingsState?.seasons || []).filter((season) => season.status === "archived").length
    const panel = createEl("section", "stats-hero stats-hero-ratings")
    const content = createEl("div", "stats-hero-layout")
    const intro = createEl("div", "stats-hero-intro")
    intro.appendChild(createEl("p", "stats-kicker", "Ratings Room"))
    intro.appendChild(
        createEl(
            "h2",
            "stats-hero-headline",
            activeSeason ? `${activeSeason.label} ladder` : "Start the first rating season",
        ),
    )
    intro.appendChild(
        createEl(
            "p",
            "stats-hero-copy",
            buildRatingsHeroCopy({ activeSeason, hasLivePreview, isArchivedView, selectedPreview }),
        ),
    )
    content.appendChild(intro)
    content.appendChild(createRatingsHeroStats({ activeSeason, archivedCount, ratingsModel, selectedMode }))
    panel.appendChild(content)
    panel.appendChild(
        createRatingsHeroControls({
            hasLivePreview,
            isArchivedView,
            onBackToActiveSeason,
            onStartSeason,
            selectedMode,
            selectedPreview,
            onSelectMode,
            onSelectPreview,
            activeSeason,
        }),
    )

    const strip = createEl("div", "stats-hero-strip")
    strip.appendChild(
        createEl(
            "span",
            "stats-trust-chip",
            isArchivedView ? "Viewing archived season" : "Ratings ignore shared query filters",
        ),
    )
    strip.appendChild(createEl("span", "stats-trust-chip", "Tournament matches only"))
    if (hasLivePreview && !isArchivedView) {
        strip.appendChild(createEl("span", "stats-trust-chip", "Live session preview available"))
    }
    strip.appendChild(createEl("span", "stats-trust-chip", `${archivedCount} archived seasons`))
    panel.appendChild(strip)
    return panel
}

function createRatingsHeroControls({
    hasLivePreview,
    isArchivedView,
    onBackToActiveSeason,
    onStartSeason,
    selectedMode,
    selectedPreview,
    onSelectMode,
    onSelectPreview,
    activeSeason,
}) {
    const controls = createEl("div", "stats-ratings-hero-controls")
    const toggleStack = createEl("div", "stats-ratings-toggle-stack")
    toggleStack.appendChild(createModeToggle(selectedMode, onSelectMode))
    if (hasLivePreview && !isArchivedView) {
        toggleStack.appendChild(createPreviewToggle(selectedPreview, onSelectPreview))
    }
    controls.appendChild(toggleStack)
    const actionRow = createEl("div", "stats-ratings-action-row")
    if (isArchivedView) {
        const backButton = createEl("button", "btn btn-ghost stats-ratings-season-btn", "Back To Current Season")
        backButton.type = "button"
        backButton.addEventListener("click", onBackToActiveSeason)
        actionRow.appendChild(backButton)
    }
    const button = createEl(
        "button",
        `btn ${activeSeason ? "btn-accent" : "btn-primary"} stats-ratings-season-btn`,
        activeSeason ? "Start New Rating Season" : "Start Rating Season",
    )
    button.type = "button"
    button.addEventListener("click", onStartSeason)
    actionRow.appendChild(button)
    controls.appendChild(actionRow)
    return controls
}

function createRatingsHeroStats({ activeSeason, archivedCount, ratingsModel, selectedMode }) {
    const ladder = ratingsModel.ladders[selectedMode]
    const grid = createEl("div", "stats-hero-counts")
    grid.appendChild(
        createHeroStat(
            "Season",
            activeSeason ? activeSeason.label : "None",
            activeSeason ? activeSeason.status : "Idle",
        ),
    )
    grid.appendChild(
        createHeroStat(
            "Ladder",
            selectedMode === "singles" ? "Singles" : "Doubles",
            formatCountLabel(ladder.leaderboard.length, "rated player"),
        ),
    )
    grid.appendChild(createHeroStat("Leader", ladder.leaderboard[0] || "—", "Current top spot"))
    grid.appendChild(createHeroStat("Archives", String(archivedCount), "Read-only snapshots"))
    return grid
}

function createHeroStat(label, value, meta) {
    const card = createEl("div", "stats-hero-stat")
    card.appendChild(createEl("span", "stats-hero-stat-label", label))
    card.appendChild(createEl("strong", "stats-hero-stat-value", value))
    card.appendChild(createEl("span", "stats-hero-stat-meta", meta))
    return card
}

function createModeToggle(selectedMode, onSelectMode) {
    const wrap = createEl("div", "stats-toggle-row")
    for (const option of [
        { key: "singles", label: "Singles" },
        { key: "doubles", label: "Doubles" },
    ]) {
        const button = createEl(
            "button",
            `stats-toggle-btn${option.key === selectedMode ? " is-selected" : ""}`,
            option.label,
        )
        button.type = "button"
        button.addEventListener("click", () => onSelectMode(option.key))
        wrap.appendChild(button)
    }
    return wrap
}

function createPreviewToggle(selectedPreview, onSelectPreview) {
    const wrap = createEl("div", "stats-toggle-row")
    for (const option of [
        { key: "live", label: "Live Preview" },
        { key: "season", label: "Season" },
    ]) {
        const button = createEl(
            "button",
            `stats-toggle-btn${option.key === selectedPreview ? " is-selected" : ""}`,
            option.label,
        )
        button.type = "button"
        button.addEventListener("click", () => onSelectPreview(option.key))
        wrap.appendChild(button)
    }
    return wrap
}

export { createRatingsHero }
