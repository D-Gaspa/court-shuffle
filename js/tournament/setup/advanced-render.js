import { isBracketFormat, normalizeByeTeam, requiresForcedSitOut } from "./advanced-model.js"

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

function renderRequiredSitOutSection(context) {
    const {
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        requiredSitOutSection,
        requiredSitOutSelect,
        advancedDraft,
    } = context

    const visible =
        tournamentTeamSize === 2 &&
        requiresForcedSitOut({
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers,
            minRequiredSitOutPool,
        })
    requiredSitOutSection.hidden = !visible
    if (!visible) {
        advancedDraft.forcedSitOutPlayer = null
        return
    }

    requiredSitOutSelect.textContent = ""
    const options = getPlayerOptions(selectedPlayers, true, "Auto pick")
    for (const option of options) {
        const optionEl = document.createElement("option")
        optionEl.value = option.value
        optionEl.textContent = option.label
        requiredSitOutSelect.appendChild(optionEl)
    }
    requiredSitOutSelect.value = advancedDraft.forcedSitOutPlayer || ""
}

function renderSinglesOpeningSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        advancedDraft,
        singlesOpeningSection,
        singlesOpeningList,
        onRequestRender,
    } = context

    const visible = tournamentTeamSize === 1 && isBracketFormat(tournamentFormat)
    singlesOpeningSection.hidden = !visible
    if (!visible) {
        return
    }

    singlesOpeningList.textContent = ""
    const rows = advancedDraft.singlesOpeningMatchups
    if (!Array.isArray(rows) || rows.length === 0) {
        addPlaceholderRow(singlesOpeningList, "No forced opening matchups.")
        return
    }

    const options = getPlayerOptions(context.selectedPlayers, true, "Select player")
    for (let i = 0; i < rows.length; i += 1) {
        const row = document.createElement("div")
        row.className = "advanced-row"

        const left = createSelect(options, rows[i][0], (next) => {
            advancedDraft.singlesOpeningMatchups[i][0] = next
        })
        const right = createSelect(options, rows[i][1], (next) => {
            advancedDraft.singlesOpeningMatchups[i][1] = next
        })

        row.appendChild(left)
        row.appendChild(createRowSeparator("vs"))
        row.appendChild(right)
        row.appendChild(
            createRemoveRowButton(() => {
                advancedDraft.singlesOpeningMatchups.splice(i, 1)
                onRequestRender()
            }),
        )
        singlesOpeningList.appendChild(row)
    }
}

function renderDoublesPairsSection(context) {
    const { tournamentTeamSize, advancedDraft, doublesPairsSection, doublesPairsList, onRequestRender } = context

    const visible = tournamentTeamSize === 2
    doublesPairsSection.hidden = !visible
    if (!visible) {
        return
    }

    doublesPairsList.textContent = ""
    const rows = advancedDraft.doublesLockedPairs
    if (!Array.isArray(rows) || rows.length === 0) {
        addPlaceholderRow(doublesPairsList, "No locked partner pairs.")
        return
    }

    const options = getPlayerOptions(context.selectedPlayers, true, "Select player")
    for (let i = 0; i < rows.length; i += 1) {
        const row = document.createElement("div")
        row.className = "advanced-row"

        row.appendChild(
            createSelect(options, rows[i][0], (next) => {
                advancedDraft.doublesLockedPairs[i][0] = next
            }),
        )
        row.appendChild(createRowSeparator("and"))
        row.appendChild(
            createSelect(options, rows[i][1], (next) => {
                advancedDraft.doublesLockedPairs[i][1] = next
            }),
        )
        row.appendChild(
            createRemoveRowButton(() => {
                advancedDraft.doublesLockedPairs.splice(i, 1)
                onRequestRender()
            }),
        )
        doublesPairsList.appendChild(row)
    }
}

function renderSinglesByesSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        selectedPlayers,
        advancedDraft,
        singlesByesSection,
        singlesByesList,
    } = context

    const visible = tournamentTeamSize === 1 && isBracketFormat(tournamentFormat)
    singlesByesSection.hidden = !visible
    if (!visible) {
        advancedDraft.singlesByePlayers = []
        return
    }

    singlesByesList.textContent = ""
    for (const player of selectedPlayers) {
        const row = document.createElement("label")
        row.className = "advanced-check-item"

        const input = document.createElement("input")
        input.type = "checkbox"
        input.checked = advancedDraft.singlesByePlayers.includes(player)
        input.addEventListener("change", () => {
            if (input.checked) {
                advancedDraft.singlesByePlayers = [...new Set([...advancedDraft.singlesByePlayers, player])]
                return
            }
            advancedDraft.singlesByePlayers = advancedDraft.singlesByePlayers.filter((name) => name !== player)
        })

        const label = document.createElement("span")
        label.textContent = player

        row.appendChild(input)
        row.appendChild(label)
        singlesByesList.appendChild(row)
    }
}

function renderDoublesByesSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        advancedDraft,
        doublesByesSection,
        doublesByesList,
        onRequestRender,
    } = context

    const visible = tournamentTeamSize === 2 && isBracketFormat(tournamentFormat)
    doublesByesSection.hidden = !visible
    if (!visible) {
        advancedDraft.doublesByeTeams = []
        return
    }

    doublesByesList.textContent = ""
    const rows = advancedDraft.doublesByeTeams
    if (!Array.isArray(rows) || rows.length === 0) {
        addPlaceholderRow(doublesByesList, "No explicit doubles bye teams.")
        return
    }

    const leftOptions = getPlayerOptions(context.selectedPlayers, true, "Select player")
    const rightOptions = getPlayerOptions(
        context.selectedPlayers,
        true,
        allowNotStrictDoubles ? "Optional" : "Select player",
    )
    appendDoublesByeRows({
        rows,
        leftOptions,
        rightOptions,
        advancedDraft,
        onRequestRender,
        doublesByesList,
    })
}

function appendDoublesByeRows({ rows, leftOptions, rightOptions, advancedDraft, onRequestRender, doublesByesList }) {
    for (let i = 0; i < rows.length; i += 1) {
        const rowValues = normalizeByeTeam(rows[i])
        const row = document.createElement("div")
        row.className = "advanced-row"

        row.appendChild(
            createSelect(leftOptions, rowValues[0], (next) => {
                const current = normalizeByeTeam(advancedDraft.doublesByeTeams[i])
                current[0] = next
                advancedDraft.doublesByeTeams[i] = current
            }),
        )
        row.appendChild(createRowSeparator("and"))
        row.appendChild(
            createSelect(rightOptions, rowValues[1], (next) => {
                const current = normalizeByeTeam(advancedDraft.doublesByeTeams[i])
                current[1] = next
                advancedDraft.doublesByeTeams[i] = current
            }),
        )
        row.appendChild(
            createRemoveRowButton(() => {
                advancedDraft.doublesByeTeams.splice(i, 1)
                onRequestRender()
            }),
        )
        doublesByesList.appendChild(row)
    }
}

function renderAdvancedModalSections(context) {
    renderRequiredSitOutSection(context)
    renderSinglesOpeningSection(context)
    renderDoublesPairsSection(context)
    renderSinglesByesSection(context)
    renderDoublesByesSection(context)
}

export { renderAdvancedModalSections }
