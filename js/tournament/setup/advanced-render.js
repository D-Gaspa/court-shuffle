import { getAdvancedEntrants } from "./advanced-context.js"
import { isBracketFormat, requiresForcedSitOut } from "./advanced-model.js"
import { getBracketByeSlotCount } from "./advanced-model-helpers.js"
import { renderDoublesByesSection, renderDoublesPairsSection } from "./advanced-render-doubles.js"
import { renderDoublesNextUpSection, renderSinglesNextUpSection } from "./advanced-render-next-up.js"
import {
    addPlaceholderRow,
    createRemoveRowButton,
    createRowSeparator,
    createSelect,
    getPlayerOptions,
} from "./advanced-render-utils.js"

function renderRequiredSitOutSection(context) {
    const {
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        requiredSitOutSection,
        requiredSitOutSelect,
        advancedDraft,
        onRequestRender,
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
    requiredSitOutSelect.onchange = () => {
        advancedDraft.forcedSitOutPlayer = requiredSitOutSelect.value || null
        onRequestRender()
    }
}

function getSelectedSinglesByePlayers(advancedDraft, byeSlots) {
    advancedDraft.singlesByePlayers = [...new Set((advancedDraft.singlesByePlayers || []).filter(Boolean))].slice(
        0,
        byeSlots,
    )
    return new Set(advancedDraft.singlesByePlayers)
}

function appendSinglesByeCheckboxes({ selectedPlayers, advancedDraft, singlesByesList, onRequestRender, byeSlots }) {
    const selectedByePlayers = getSelectedSinglesByePlayers(advancedDraft, byeSlots)
    for (const player of selectedPlayers) {
        const row = document.createElement("label")
        row.className = "advanced-check-item"

        const input = document.createElement("input")
        input.type = "checkbox"
        input.checked = selectedByePlayers.has(player)
        input.disabled = !input.checked && selectedByePlayers.size >= byeSlots
        input.addEventListener("change", () => {
            if (input.checked) {
                advancedDraft.singlesByePlayers = [...new Set([...advancedDraft.singlesByePlayers, player])]
            } else {
                advancedDraft.singlesByePlayers = advancedDraft.singlesByePlayers.filter((name) => name !== player)
            }
            onRequestRender()
        })

        const label = document.createElement("span")
        label.textContent = player

        row.appendChild(input)
        row.appendChild(label)
        singlesByesList.appendChild(row)
    }
}

function renderSinglesByesSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        selectedPlayers,
        minRequiredSitOutPool,
        advancedDraft,
        singlesByesSection,
        singlesByesList,
        onRequestRender,
    } = context

    const byeSlots = getBracketByeSlotCount({
        selectedPlayers,
        tournamentTeamSize,
        allowNotStrictDoubles: true,
        minRequiredSitOutPool,
    })
    const visible = tournamentTeamSize === 1 && isBracketFormat(tournamentFormat) && byeSlots > 0
    singlesByesSection.hidden = !visible
    if (!visible) {
        advancedDraft.singlesByePlayers = []
        return
    }

    singlesByesList.textContent = ""
    appendSinglesByeCheckboxes({
        selectedPlayers,
        advancedDraft,
        singlesByesList,
        onRequestRender,
        byeSlots,
    })
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
            onRequestRender()
        })
        const right = createSelect(options, rows[i][1], (next) => {
            advancedDraft.singlesOpeningMatchups[i][1] = next
            onRequestRender()
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

function renderAdvancedModalSections(context) {
    const activeDoublesPlayers = getAdvancedEntrants({
        selectedPlayers: context.selectedPlayers,
        tournamentTeamSize: context.tournamentTeamSize,
        allowNotStrictDoubles: context.allowNotStrictDoubles,
        minRequiredSitOutPool: context.minRequiredSitOutPool,
        forcedSitOutPlayer: context.advancedDraft.forcedSitOutPlayer,
    })
    renderRequiredSitOutSection(context)
    renderSinglesOpeningSection(context)
    renderDoublesPairsSection({ ...context, selectedPlayers: activeDoublesPlayers })
    renderSinglesByesSection(context)
    renderDoublesByesSection(context)
    renderSinglesNextUpSection({
        ...context,
        courtCount: context.courtCount,
        minRequiredSitOutPool: context.minRequiredSitOutPool,
    })
    renderDoublesNextUpSection({
        ...context,
        selectedPlayers: context.selectedPlayers,
        courtCount: context.courtCount,
        minRequiredSitOutPool: context.minRequiredSitOutPool,
    })
}

export { renderAdvancedModalSections }
