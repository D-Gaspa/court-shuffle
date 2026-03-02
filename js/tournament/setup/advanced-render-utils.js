function getPlayerOptions(selectedPlayers, withBlank = true, blankLabel = "Any") {
    const options = []
    if (withBlank) {
        options.push({ value: "", label: blankLabel })
    }
    for (const player of selectedPlayers) {
        options.push({ value: player, label: player })
    }
    return options
}

function createSelect(options, value, onChange) {
    const select = document.createElement("select")
    select.className = "advanced-select"
    for (const option of options) {
        const optionEl = document.createElement("option")
        optionEl.value = option.value
        optionEl.textContent = option.label
        select.appendChild(optionEl)
    }
    select.value = value || ""
    select.addEventListener("change", () => onChange(select.value))
    return select
}

function createRemoveRowButton(onClick) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "btn btn-ghost btn-sm btn-danger"
    button.textContent = "Remove"
    button.addEventListener("click", onClick)
    return button
}

function createRowSeparator(text = "vs") {
    const separator = document.createElement("span")
    separator.className = "advanced-row-separator"
    separator.textContent = text
    return separator
}

function addPlaceholderRow(listEl, text) {
    const empty = document.createElement("div")
    empty.className = "hint"
    empty.textContent = text
    listEl.appendChild(empty)
}

function getRowValue(row, index) {
    return typeof row?.[index] === "string" ? row[index] : ""
}

export { addPlaceholderRow, createRemoveRowButton, createRowSeparator, createSelect, getPlayerOptions, getRowValue }
