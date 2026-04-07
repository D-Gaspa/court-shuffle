import { getAdvancedEntrants, getRoundOneQueueTeamSlotCount } from "../context.js"
import { getConfiguredDoublesTeamsByKey, normalizeTeamKey, toLockedTeamPlayers } from "../model/helpers.js"
import { addPlaceholderRow, createAdvancedCheckCard } from "./utils.js"

function getSelectedSinglesNextUpPlayers(advancedDraft, slotCount) {
    advancedDraft.singlesNextUpPlayers = [...new Set((advancedDraft.singlesNextUpPlayers || []).filter(Boolean))].slice(
        0,
        slotCount,
    )
    return new Set(advancedDraft.singlesNextUpPlayers)
}

function getSinglesNextUpMeta({ checked, disabledByBye, disabledByCapacity }) {
    if (checked) {
        return "Queued off court for Round 1"
    }
    if (disabledByBye) {
        return "Unavailable: Round 1 bye locked"
    }
    if (disabledByCapacity) {
        return "Unavailable: queue slots full"
    }
    return "Delay this player to queued matches"
}

function appendSinglesNextUpRows({ activePlayers, advancedDraft, singlesNextUpList, onRequestRender, slotCount }) {
    const selectedPlayers = getSelectedSinglesNextUpPlayers(advancedDraft, slotCount)
    const byePlayers = new Set(advancedDraft.singlesByePlayers || [])
    for (const player of activePlayers) {
        const checked = selectedPlayers.has(player)
        const disabledByBye = !checked && byePlayers.has(player)
        const disabledByCapacity = !checked && selectedPlayers.size >= slotCount
        const disabled = disabledByBye || disabledByCapacity
        const row = createAdvancedCheckCard({
            title: player,
            meta: getSinglesNextUpMeta({ checked, disabledByBye, disabledByCapacity }),
            checked,
            disabled,
            name: `advanced-singles-next-up-${player}`,
            onChange: (isChecked) => {
                if (isChecked) {
                    advancedDraft.singlesNextUpPlayers = [...new Set([...advancedDraft.singlesNextUpPlayers, player])]
                } else {
                    advancedDraft.singlesNextUpPlayers = advancedDraft.singlesNextUpPlayers.filter(
                        (name) => name !== player,
                    )
                }
                onRequestRender()
            },
        })

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
    const checked = selectedKeys.has(key)
    const disabled = !checked && selectedKeys.size >= slotCount
    const row = createAdvancedCheckCard({
        title: team.length === 1 ? team[0] : `${team[0]} & ${team[1]}`,
        meta: team.length === 1 ? "Delay solo lock" : "Delay locked team",
        checked,
        disabled,
        name: `advanced-doubles-next-up-${key}`,
        onChange: (isChecked) => {
            if (isChecked) {
                selectedKeys.add(key)
            } else {
                selectedKeys.delete(key)
            }
            syncDoublesNextUpTeams(advancedDraft, selectedKeys, lockedTeamsByKey)
            onRequestRender()
        },
    })

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
        [...getConfiguredDoublesTeamsByKey(advancedDraft.doublesLockedPairs, allowNotStrictDoubles)].filter(
            ([, team]) => team.every((player) => activeEntrants.has(player)),
        ),
    )
}

function collectSelectedDoublesNextUpKeys(advancedDraft, lockedTeamsByKey, allowNotStrictDoubles, slotCount) {
    const selectedKeys = new Set()
    for (const team of advancedDraft.doublesNextUpTeams || []) {
        const normalized = toLockedTeamPlayers(team, allowNotStrictDoubles)
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
