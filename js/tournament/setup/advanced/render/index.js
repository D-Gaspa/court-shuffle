import { getAdvancedEntrants } from "../context.js"
import { getBracketByeSlotCount } from "../model/helpers.js"
import { isBracketFormat, requiresForcedSitOut } from "../model/index.js"
import { getSinglesOpeningSelectablePlayers } from "../model/singles-opening.js"
import { renderDoublesByesSection, renderDoublesPairsSection, renderDoublesRestrictionsSection } from "./doubles.js"
import { renderDoublesNextUpSection, renderSinglesNextUpSection } from "./next-up.js"
import {
    addPlaceholderRow,
    createAdvancedCheckCard,
    createRemoveRowButton,
    createRowSeparator,
    createSelect,
    getPlayerOptions,
} from "./utils.js"

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

function getSinglesByeMeta(checked, disabled) {
    if (checked) {
        return "Round 1 bye locked"
    }
    if (disabled) {
        return "Unavailable: bye slots full"
    }
    return "Eligible for a Round 1 bye"
}

function appendSinglesByeCheckboxes({ selectedPlayers, advancedDraft, singlesByesList, onRequestRender, byeSlots }) {
    const selectedByePlayers = getSelectedSinglesByePlayers(advancedDraft, byeSlots)
    for (const player of selectedPlayers) {
        const checked = selectedByePlayers.has(player)
        const disabled = !checked && selectedByePlayers.size >= byeSlots
        const row = createAdvancedCheckCard({
            title: player,
            meta: getSinglesByeMeta(checked, disabled),
            checked,
            disabled,
            name: `advanced-singles-bye-${player}`,
            onChange: (isChecked) => {
                if (isChecked) {
                    advancedDraft.singlesByePlayers = [...new Set([...advancedDraft.singlesByePlayers, player])]
                } else {
                    advancedDraft.singlesByePlayers = advancedDraft.singlesByePlayers.filter((name) => name !== player)
                }
                onRequestRender()
            },
        })

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

function buildSinglesOpeningOptions(advancedDraft, selectedPlayers, rowIndex, sideIndex) {
    return getPlayerOptions(
        getSinglesOpeningSelectablePlayers({
            advancedDraft,
            selectedPlayers,
            rowIndex,
            sideIndex,
        }),
        true,
        "Select player",
    )
}

function appendSinglesOpeningRow({ advancedDraft, selectedPlayers, singlesOpeningList, onRequestRender, rowIndex }) {
    const row = document.createElement("div")
    row.className = "advanced-row"

    const left = createSelect(
        buildSinglesOpeningOptions(advancedDraft, selectedPlayers, rowIndex, 0),
        advancedDraft.singlesOpeningMatchups[rowIndex][0],
        (next) => {
            advancedDraft.singlesOpeningMatchups[rowIndex][0] = next
            onRequestRender()
        },
        { name: `advanced-singles-opening-${rowIndex}-left` },
    )
    const right = createSelect(
        buildSinglesOpeningOptions(advancedDraft, selectedPlayers, rowIndex, 1),
        advancedDraft.singlesOpeningMatchups[rowIndex][1],
        (next) => {
            advancedDraft.singlesOpeningMatchups[rowIndex][1] = next
            onRequestRender()
        },
        { name: `advanced-singles-opening-${rowIndex}-right` },
    )

    row.appendChild(left)
    row.appendChild(createRowSeparator("vs"))
    row.appendChild(right)
    row.appendChild(
        createRemoveRowButton(() => {
            advancedDraft.singlesOpeningMatchups.splice(rowIndex, 1)
            onRequestRender()
        }),
    )
    singlesOpeningList.appendChild(row)
}

function renderSinglesOpeningRows({ advancedDraft, selectedPlayers, singlesOpeningList, onRequestRender }) {
    for (let rowIndex = 0; rowIndex < advancedDraft.singlesOpeningMatchups.length; rowIndex += 1) {
        appendSinglesOpeningRow({
            advancedDraft,
            selectedPlayers,
            singlesOpeningList,
            onRequestRender,
            rowIndex,
        })
    }
}

function renderSinglesOpeningSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        selectedPlayers,
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

    renderSinglesOpeningRows({
        advancedDraft,
        selectedPlayers,
        singlesOpeningList,
        onRequestRender,
    })
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
    renderDoublesRestrictionsSection({
        ...context,
        selectedPlayers: activeDoublesPlayers,
    })
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
