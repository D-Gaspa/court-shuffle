import { getAvatarClass, getInitials } from "../roster/render.js"
import { formatPercent, formatRecord } from "./format.js"

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

function createPlayerListPanel(players, selectedPlayer, playerSummariesByName, onSelectPlayer) {
    const section = createEl("section", "stats-panel stats-panel-rail stagger-2")
    section.appendChild(createHeader())
    const list = createEl("div", "roster-list stats-player-list")
    for (let index = 0; index < players.length; index += 1) {
        const player = players[index]
        const summary = playerSummariesByName[player]
        list.appendChild(
            createPlayerRow({
                player,
                index,
                summary,
                selected: player === selectedPlayer,
                onSelectPlayer,
            }),
        )
    }
    section.appendChild(list)
    return section
}

function createHeader() {
    const header = createEl("div", "stats-panel-header")
    header.appendChild(createEl("h3", "stats-panel-title", "Players"))
    header.appendChild(createEl("p", "stats-panel-subtitle", "Roster-style list with quick stats"))
    return header
}

function createPlayerRow(config) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = `roster-item stats-player-row${config.selected ? " is-selected" : ""}`
    button.appendChild(createAvatar(config.player, config.index))
    button.appendChild(createNameWrap(config.player))
    button.appendChild(createQuickMeta(config.summary))
    button.addEventListener("click", () => config.onSelectPlayer(config.player))
    return button
}

function createAvatar(player, index) {
    const avatar = createEl("div", `player-avatar ${getAvatarClass(index)}`)
    avatar.textContent = getInitials(player).toUpperCase()
    return avatar
}

function createNameWrap(player) {
    const wrap = createEl("div", "stats-player-name-wrap")
    wrap.appendChild(createEl("span", "player-name", player))
    return wrap
}

function createQuickMeta(summary) {
    const meta = createEl("div", "stats-player-row-meta")
    meta.appendChild(createPill(formatPercent(summary.winRate), "win"))
    meta.appendChild(createPill(formatRecord(summary.wins, summary.losses), "record"))
    meta.appendChild(createPill(`${summary.decidedMatches}M`, "matches"))
    return meta
}

function createPill(text, tone) {
    const pill = createEl("span", `stats-player-row-pill stats-player-row-pill-${tone}`, text)
    return pill
}

export { createPlayerListPanel }
