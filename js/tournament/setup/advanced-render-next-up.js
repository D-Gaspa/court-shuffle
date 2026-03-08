import { getAdvancedEntrants, getRoundOneQueueTeamSlotCount } from "./advanced-context.js"
import { addPlaceholderRow } from "./advanced-render-utils.js"

function normalizeTeamKey(team) {
    return [...team].sort().join("||")
}

function toNormalizedLockedTeam(row, allowNotStrictDoubles) {
    const left = typeof row?.[0] === "string" ? row[0] : ""
    const right = typeof row?.[1] === "string" ? row[1] : ""
    if (left && right) {
        if (left === right) {
            return null
        }
        return [left, right]
    }
    if (!allowNotStrictDoubles) {
        return null
    }
    const solo = left || right
    return solo ? [solo] : null
}

function getCompleteLockedTeams(rows, allowNotStrictDoubles) {
    const byKey = new Map()
    for (const row of rows || []) {
        const team = toNormalizedLockedTeam(row, allowNotStrictDoubles)
        if (!team) {
            continue
        }
        const key = normalizeTeamKey(team)
        if (!byKey.has(key)) {
            byKey.set(key, team)
        }
    }
    return byKey
}

function getSelectedSinglesNextUpPlayers(advancedDraft, slotCount) {
    advancedDraft.singlesNextUpPlayers = [...new Set((advancedDraft.singlesNextUpPlayers || []).filter(Boolean))].slice(
        0,
        slotCount,
    )
    return new Set(advancedDraft.singlesNextUpPlayers)
}

function appendSinglesNextUpRows({ activePlayers, advancedDraft, singlesNextUpList, onRequestRender, slotCount }) {
    const selectedPlayers = getSelectedSinglesNextUpPlayers(advancedDraft, slotCount)
    for (const player of activePlayers) {
        const row = document.createElement("label")
        row.className = "advanced-check-item"

        const input = document.createElement("input")
        input.type = "checkbox"
        input.checked = selectedPlayers.has(player)
        input.disabled = !input.checked && selectedPlayers.size >= slotCount
        input.addEventListener("change", () => {
            if (input.checked) {
                advancedDraft.singlesNextUpPlayers = [...new Set([...advancedDraft.singlesNextUpPlayers, player])]
            } else {
                advancedDraft.singlesNextUpPlayers = advancedDraft.singlesNextUpPlayers.filter(
                    (name) => name !== player,
                )
            }
            onRequestRender()
        })

        const label = document.createElement("span")
        label.textContent = player

        row.appendChild(input)
        row.appendChild(label)
        singlesNextUpList.appendChild(row)
    }
}

function renderSinglesNextUpSection(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        selectedPlayers,
        minRequiredSitOutPool,
        courtCount,
        advancedDraft,
        singlesNextUpSection,
        singlesNextUpList,
        onRequestRender,
    } = context

    const slotCount = getRoundOneQueueTeamSlotCount({
        selectedPlayers,
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles: true,
        minRequiredSitOutPool,
        courtCount,
    })
    const visible = tournamentTeamSize === 1 && slotCount > 0
    singlesNextUpSection.hidden = !visible
    if (!visible) {
        advancedDraft.singlesNextUpPlayers = []
        return
    }

    singlesNextUpList.textContent = ""
    appendSinglesNextUpRows({
        activePlayers: selectedPlayers,
        advancedDraft,
        singlesNextUpList,
        onRequestRender,
        slotCount,
    })
}

function syncDoublesNextUpTeams(advancedDraft, selectedKeys, lockedTeamsByKey) {
    advancedDraft.doublesNextUpTeams = [...selectedKeys]
        .map((key) => lockedTeamsByKey.get(key))
        .filter((team) => Array.isArray(team) && team.length > 0)
        .map((team) => [...team])
}

function appendDoublesNextUpRow({
    key,
    team,
    selectedKeys,
    lockedTeamsByKey,
    advancedDraft,
    doublesNextUpList,
    slotCount,
    onRequestRender,
}) {
    const row = document.createElement("label")
    row.className = "advanced-check-item advanced-check-item-bye"

    const input = document.createElement("input")
    input.type = "checkbox"
    input.className = "advanced-check-box"
    input.checked = selectedKeys.has(key)
    input.disabled = !input.checked && selectedKeys.size >= slotCount
    input.addEventListener("change", () => {
        if (input.checked) {
            selectedKeys.add(key)
        } else {
            selectedKeys.delete(key)
        }
        syncDoublesNextUpTeams(advancedDraft, selectedKeys, lockedTeamsByKey)
        onRequestRender()
    })

    const copy = document.createElement("span")
    copy.className = "advanced-check-copy"

    const title = document.createElement("span")
    title.className = "advanced-check-title"
    title.textContent = team.length === 1 ? team[0] : `${team[0]} & ${team[1]}`

    const meta = document.createElement("span")
    meta.className = "advanced-check-meta"
    meta.textContent = team.length === 1 ? "Delay solo lock" : "Delay locked team"

    copy.appendChild(title)
    copy.appendChild(meta)
    row.appendChild(input)
    row.appendChild(copy)
    doublesNextUpList.appendChild(row)
}

function getDoublesNextUpRenderContext(context) {
    const {
        tournamentTeamSize,
        tournamentFormat,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
        courtCount,
        advancedDraft,
    } = context
    const activePlayers = getAdvancedEntrants({
        selectedPlayers,
        tournamentTeamSize,
        allowNotStrictDoubles,
        minRequiredSitOutPool,
        forcedSitOutPlayer: advancedDraft.forcedSitOutPlayer,
    })
    return {
        activePlayers,
        slotCount: getRoundOneQueueTeamSlotCount({
            selectedPlayers,
            tournamentTeamSize,
            tournamentFormat,
            allowNotStrictDoubles,
            minRequiredSitOutPool,
            courtCount,
        }),
    }
}

function getSelectableLockedTeams(advancedDraft, allowNotStrictDoubles, activePlayers) {
    const activeEntrants = new Set(activePlayers)
    return new Map(
        [...getCompleteLockedTeams(advancedDraft.doublesLockedPairs, allowNotStrictDoubles)].filter(([, team]) =>
            team.every((player) => activeEntrants.has(player)),
        ),
    )
}

function collectSelectedDoublesNextUpKeys(advancedDraft, lockedTeamsByKey, allowNotStrictDoubles, slotCount) {
    const selectedKeys = new Set()
    for (const team of advancedDraft.doublesNextUpTeams || []) {
        const normalized = toNormalizedLockedTeam(team, allowNotStrictDoubles)
        if (!normalized) {
            continue
        }
        const key = normalizeTeamKey(normalized)
        if (lockedTeamsByKey.has(key)) {
            selectedKeys.add(key)
        }
    }
    while (selectedKeys.size > slotCount) {
        const last = [...selectedKeys].at(-1)
        if (!last) {
            break
        }
        selectedKeys.delete(last)
    }
    return selectedKeys
}

function renderDoublesNextUpSection(context) {
    const {
        tournamentTeamSize,
        allowNotStrictDoubles,
        advancedDraft,
        doublesNextUpSection,
        doublesNextUpList,
        onRequestRender,
    } = context
    const { activePlayers, slotCount } = getDoublesNextUpRenderContext(context)

    const visible = tournamentTeamSize === 2 && slotCount > 0
    doublesNextUpSection.hidden = !visible
    if (!visible) {
        advancedDraft.doublesNextUpTeams = []
        return
    }

    doublesNextUpList.textContent = ""
    const lockedTeamsByKey = getSelectableLockedTeams(advancedDraft, allowNotStrictDoubles, activePlayers)
    if (lockedTeamsByKey.size === 0) {
        advancedDraft.doublesNextUpTeams = []
        addPlaceholderRow(doublesNextUpList, "Add locked doubles teams to choose who waits off court first.")
        return
    }

    const selectedKeys = collectSelectedDoublesNextUpKeys(
        advancedDraft,
        lockedTeamsByKey,
        allowNotStrictDoubles,
        slotCount,
    )
    syncDoublesNextUpTeams(advancedDraft, selectedKeys, lockedTeamsByKey)
    for (const [key, team] of lockedTeamsByKey) {
        appendDoublesNextUpRow({
            key,
            team,
            selectedKeys,
            lockedTeamsByKey,
            advancedDraft,
            doublesNextUpList,
            slotCount,
            onRequestRender,
        })
    }
}

export { renderDoublesNextUpSection, renderSinglesNextUpSection }
