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

function createSelect(options, value, onChange, attributes = {}) {
    const select = document.createElement("select")
    select.className = "advanced-select"
    if (attributes.id) {
        select.id = attributes.id
    }
    if (attributes.name) {
        select.name = attributes.name
    }
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

function createAdvancedCheckCard({ title, meta, checked = false, disabled = false, name = "", onChange }) {
    const row = document.createElement("label")
    row.className = "advanced-check-item advanced-check-item-bye"
    row.classList.toggle("is-selected", checked)
    row.classList.toggle("is-disabled", disabled)

    const input = document.createElement("input")
    input.type = "checkbox"
    input.className = "advanced-check-box"
    input.checked = checked
    input.disabled = disabled
    if (name) {
        input.name = name
    }
    input.addEventListener("change", () => onChange(input.checked))

    const copy = document.createElement("span")
    copy.className = "advanced-check-copy"

    const titleEl = document.createElement("span")
    titleEl.className = "advanced-check-title"
    titleEl.textContent = title

    const metaEl = document.createElement("span")
    metaEl.className = "advanced-check-meta"
    metaEl.textContent = meta

    copy.appendChild(titleEl)
    copy.appendChild(metaEl)
    row.appendChild(input)
    row.appendChild(copy)
    return row
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

export {
    addPlaceholderRow,
    createAdvancedCheckCard,
    createRemoveRowButton,
    createRowSeparator,
    createSelect,
    getPlayerOptions,
    getRowValue,
}
