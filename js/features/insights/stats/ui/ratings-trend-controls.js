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

function createTrendGroupingToggle(selectedTrendGrouping, onSelectTrendGrouping) {
    const row = createEl("div", "stats-ratings-trend-toggle")
    const handleSelect = typeof onSelectTrendGrouping === "function" ? onSelectTrendGrouping : () => undefined
    for (const option of [
        { key: "match", label: "Per Match" },
        { key: "session", label: "Per Night" },
    ]) {
        const button = createEl(
            "button",
            `stats-toggle-btn${option.key === selectedTrendGrouping ? " is-selected" : ""}`,
            option.label,
        )
        button.type = "button"
        button.addEventListener("click", () => handleSelect(option.key))
        row.appendChild(button)
    }
    return row
}

export { createTrendGroupingToggle }
