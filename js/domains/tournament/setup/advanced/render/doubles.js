import { renderDoublesByesSection as renderDoublesByesSectionValue } from "./doubles-byes.js"
import {
    addPlaceholderRow,
    createRemoveRowButton,
    createRowSeparator,
    createSelect,
    getPlayerOptions,
    getRowValue,
} from "./utils.js"

const renderDoublesByesSection = renderDoublesByesSectionValue

function getSelectablePlayers({ selectedPlayers, blockedPlayers, currentValue }) {
    return selectedPlayers.filter((player) => player === currentValue || !blockedPlayers.has(player))
}

function getRowOptions({ rows, rowIndex, selectedPlayers, allowNotStrictDoubles, blockPlayersFromOtherRows }) {
    const currentLeft = getRowValue(rows[rowIndex], 0)
    const currentRight = getRowValue(rows[rowIndex], 1)
    const blockedByOtherRows = new Set()

    if (blockPlayersFromOtherRows) {
        for (let i = 0; i < rows.length; i += 1) {
            if (i === rowIndex) {
                continue
            }
            const left = getRowValue(rows[i], 0)
            const right = getRowValue(rows[i], 1)
            if (left) {
                blockedByOtherRows.add(left)
            }
            if (right) {
                blockedByOtherRows.add(right)
            }
        }
    }

    const blockedForLeft = new Set(blockedByOtherRows)
    if (currentRight) {
        blockedForLeft.add(currentRight)
    }

    const blockedForRight = new Set(blockedByOtherRows)
    if (currentLeft) {
        blockedForRight.add(currentLeft)
    }

    return {
        currentLeft,
        currentRight,
        leftOptions: getPlayerOptions(
            getSelectablePlayers({ selectedPlayers, blockedPlayers: blockedForLeft, currentValue: currentLeft }),
            true,
            "Select player",
        ),
        rightOptions: getPlayerOptions(
            getSelectablePlayers({ selectedPlayers, blockedPlayers: blockedForRight, currentValue: currentRight }),
            true,
            allowNotStrictDoubles ? "Optional (solo team)" : "Select player",
        ),
    }
}

function appendDoublesTeamRow({
    rows,
    rowIndex,
    selectedPlayers,
    allowNotStrictDoubles,
    advancedRows,
    listEl,
    onRequestRender,
    separatorText,
    namePrefix,
    soloClassName = "",
    blockPlayersFromOtherRows = false,
}) {
    const row = document.createElement("div")
    row.className = "advanced-row"
    const { currentLeft, currentRight, leftOptions, rightOptions } = getRowOptions({
        rows,
        rowIndex,
        selectedPlayers,
        allowNotStrictDoubles,
        blockPlayersFromOtherRows,
    })

    row.appendChild(
        createSelect(
            leftOptions,
            currentLeft,
            (next) => {
                advancedRows[rowIndex][0] = next
                if (next && advancedRows[rowIndex][1] === next) {
                    advancedRows[rowIndex][1] = ""
                }
                onRequestRender()
            },
            { name: `${namePrefix}-${rowIndex}-left` },
        ),
    )
    row.appendChild(createRowSeparator(separatorText))
    row.appendChild(
        createSelect(
            rightOptions,
            currentRight,
            (next) => {
                advancedRows[rowIndex][1] = next
                if (next && advancedRows[rowIndex][0] === next) {
                    advancedRows[rowIndex][0] = ""
                }
                onRequestRender()
            },
            { name: `${namePrefix}-${rowIndex}-right` },
        ),
    )
    if (allowNotStrictDoubles && (currentLeft || currentRight) && !(currentLeft && currentRight) && soloClassName) {
        row.classList.add(soloClassName)
    }
    row.appendChild(
        createRemoveRowButton(() => {
            advancedRows.splice(rowIndex, 1)
            onRequestRender()
        }),
    )
    listEl.appendChild(row)
}

function updateLockedAddButton(addDoublesPairBtn, rows, selectedPlayers, allowNotStrictDoubles) {
    if (!addDoublesPairBtn) {
        return
    }
    const usedPlayers = new Set(rows.flat().filter(Boolean))
    const availablePlayers = selectedPlayers.filter((player) => !usedPlayers.has(player))
    addDoublesPairBtn.disabled = availablePlayers.length < (allowNotStrictDoubles ? 1 : 2)
}

function updateRestrictedAddButton(addDoublesRestrictionBtn, selectedPlayers, allowNotStrictDoubles) {
    if (!addDoublesRestrictionBtn) {
        return
    }
    addDoublesRestrictionBtn.disabled = selectedPlayers.length < (allowNotStrictDoubles ? 1 : 2)
}

function updateRestrictedActionButtons({
    fillDoublesRestrictionBtn,
    fillDoublesRestrictionSessionBtn,
    clearDoublesRestrictionBtn,
    visible,
    hasRows,
}) {
    if (fillDoublesRestrictionBtn) {
        fillDoublesRestrictionBtn.disabled = !visible
    }
    if (fillDoublesRestrictionSessionBtn) {
        fillDoublesRestrictionSessionBtn.disabled = !visible
    }
    if (clearDoublesRestrictionBtn) {
        clearDoublesRestrictionBtn.disabled = !(visible && hasRows)
        clearDoublesRestrictionBtn.hidden = !(visible && hasRows)
    }
}

function renderDoublesPairsSection(context) {
    const {
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        advancedDraft,
        doublesPairsSection,
        doublesPairsList,
        addDoublesPairBtn,
        onRequestRender,
    } = context

    const visible = tournamentTeamSize === 2
    doublesPairsSection.hidden = !visible
    if (addDoublesPairBtn) {
        addDoublesPairBtn.disabled = true
    }
    if (!visible) {
        return
    }

    doublesPairsList.textContent = ""
    const rows = Array.isArray(advancedDraft.doublesLockedPairs) ? advancedDraft.doublesLockedPairs : []
    updateLockedAddButton(addDoublesPairBtn, rows, selectedPlayers, allowNotStrictDoubles)
    if (rows.length === 0) {
        addPlaceholderRow(doublesPairsList, "No locked doubles teams.")
        return
    }

    for (let i = 0; i < rows.length; i += 1) {
        appendDoublesTeamRow({
            rows,
            rowIndex: i,
            selectedPlayers,
            allowNotStrictDoubles,
            advancedRows: advancedDraft.doublesLockedPairs,
            listEl: doublesPairsList,
            onRequestRender,
            separatorText: allowNotStrictDoubles ? "+" : "and",
            namePrefix: "advanced-doubles-lock",
            soloClassName: "advanced-row-solo-lock",
            blockPlayersFromOtherRows: true,
        })
    }
}

function renderDoublesRestrictionsSection(context) {
    const {
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        advancedDraft,
        doublesRestrictionsSection,
        doublesRestrictionsList,
        addDoublesRestrictionBtn,
        fillDoublesRestrictionBtn,
        fillDoublesRestrictionSessionBtn,
        clearDoublesRestrictionBtn,
        onRequestRender,
    } = context

    const visible = tournamentTeamSize === 2
    doublesRestrictionsSection.hidden = !visible
    updateRestrictedAddButton(addDoublesRestrictionBtn, selectedPlayers, allowNotStrictDoubles)
    const rows = Array.isArray(advancedDraft.doublesRestrictedTeams) ? advancedDraft.doublesRestrictedTeams : []
    updateRestrictedActionButtons({
        fillDoublesRestrictionBtn,
        fillDoublesRestrictionSessionBtn,
        clearDoublesRestrictionBtn,
        visible,
        hasRows: rows.length > 0,
    })
    if (!visible) {
        return
    }

    doublesRestrictionsList.textContent = ""
    if (rows.length === 0) {
        addPlaceholderRow(doublesRestrictionsList, "No restricted doubles teams.")
        return
    }

    for (let i = 0; i < rows.length; i += 1) {
        appendDoublesTeamRow({
            rows,
            rowIndex: i,
            selectedPlayers,
            allowNotStrictDoubles,
            advancedRows: advancedDraft.doublesRestrictedTeams,
            listEl: doublesRestrictionsList,
            onRequestRender,
            separatorText: allowNotStrictDoubles ? "+" : "and",
            namePrefix: "advanced-doubles-restriction",
            soloClassName: "advanced-row-solo-restriction",
        })
    }
}

export { renderDoublesByesSection, renderDoublesPairsSection, renderDoublesRestrictionsSection }
