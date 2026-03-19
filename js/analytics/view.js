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

function createAnalyticsQueryPanel({
    title,
    subtitle,
    query,
    options,
    summary,
    onQueryChange,
    onResetQuery,
    showPlayerFilter = true,
}) {
    const section = createEl("section", "analytics-panel")
    const header = createEl("div", "analytics-panel-header")
    const titleWrap = createEl("div", "analytics-panel-copy")
    titleWrap.appendChild(createEl("p", "analytics-panel-kicker", "Shared Query"))
    titleWrap.appendChild(createEl("h3", "analytics-panel-title", title))
    titleWrap.appendChild(createEl("p", "analytics-panel-subtitle", subtitle))
    header.appendChild(titleWrap)
    header.appendChild(createEl("span", "analytics-panel-count", summary.resultCountLabel))
    section.appendChild(header)
    section.appendChild(createTimePresetRow(query, options.timeOptions, onQueryChange))
    section.appendChild(
        createFieldsGrid({
            query,
            options,
            summary,
            onQueryChange,
            showPlayerFilter,
        }),
    )
    section.appendChild(createActiveChipRow(summary.activeChips, onResetQuery))
    return section
}

function createTimePresetRow(query, timeOptions, onQueryChange) {
    const wrap = createEl("div", "analytics-time-row")
    wrap.appendChild(createEl("span", "analytics-field-label", "Window"))
    const buttons = createEl("div", "analytics-chip-row")
    for (const option of timeOptions) {
        const button = createEl(
            "button",
            `analytics-chip-btn${option.key === query.timePreset ? " is-selected" : ""}`,
            option.label,
        )
        button.type = "button"
        button.setAttribute("aria-pressed", String(option.key === query.timePreset))
        button.addEventListener("click", () => onQueryChange({ timePreset: option.key }))
        buttons.appendChild(button)
    }
    wrap.appendChild(buttons)
    return wrap
}

function createFieldsGrid({ query, options, summary, onQueryChange, showPlayerFilter }) {
    const grid = createEl("div", "analytics-field-grid")
    if (showPlayerFilter) {
        grid.appendChild(
            createField({
                label: "Player",
                control: createSelect({
                    value: query.player,
                    options: [
                        { value: "all", label: "All Players" },
                        ...options.playerOptions.map((player) => ({ value: player, label: player })),
                    ],
                    onChange: (value) => onQueryChange({ player: value }),
                }),
            }),
        )
    }
    grid.appendChild(
        createField({
            label: "Mode",
            control: createSelect({
                value: query.mode,
                options: options.modeOptions.map((option) => ({ value: option.key, label: option.label })),
                onChange: (value) => onQueryChange({ mode: value }),
            }),
        }),
    )
    if (summary.showTournamentFormatFilter) {
        grid.appendChild(
            createField({
                label: "Tournament",
                control: createSelect({
                    value: query.tournamentFormat,
                    options: [
                        { value: "all", label: "All Formats" },
                        ...options.tournamentFormatOptions.map((option) => ({
                            value: option.key,
                            label: option.label,
                        })),
                    ],
                    onChange: (value) => onQueryChange({ tournamentFormat: value }),
                }),
            }),
        )
    }
    if (query.timePreset === "custom") {
        grid.appendChild(
            createField({
                label: "From",
                control: createDateInput(query.dateFrom, (value) => onQueryChange({ dateFrom: value })),
            }),
        )
        grid.appendChild(
            createField({
                label: "To",
                control: createDateInput(query.dateTo, (value) => onQueryChange({ dateTo: value })),
            }),
        )
    }
    return grid
}

function createField({ label, control, wide = false }) {
    const wrap = createEl("label", `analytics-field${wide ? " is-wide" : ""}`)
    wrap.appendChild(createEl("span", "analytics-field-label", label))
    wrap.appendChild(control)
    return wrap
}

function createDateInput(value, onChange) {
    const input = document.createElement("input")
    input.className = "analytics-input"
    input.type = "date"
    input.value = value
    input.addEventListener("input", () => onChange(input.value))
    return input
}

function createSelect({ value, options, onChange }) {
    const select = document.createElement("select")
    select.className = "analytics-select"
    for (const option of options) {
        const item = document.createElement("option")
        item.value = option.value
        item.textContent = option.label
        item.selected = option.value === value
        select.appendChild(item)
    }
    select.addEventListener("change", () => onChange(select.value))
    return select
}

function createActiveChipRow(activeChips, onResetQuery) {
    const row = createEl("div", "analytics-active-row")
    const chips = createEl("div", "analytics-active-chips")
    for (const chip of activeChips) {
        chips.appendChild(createEl("span", "analytics-active-chip", chip))
    }
    row.appendChild(chips)
    const button = createEl("button", "btn btn-ghost btn-sm analytics-reset-btn", "Reset Query")
    button.type = "button"
    button.addEventListener("click", onResetQuery)
    row.appendChild(button)
    return row
}

export { createAnalyticsQueryPanel }
