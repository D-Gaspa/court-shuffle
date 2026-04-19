import { getModeLabel } from "../../../ui/common/utils.js"
import { buildHistoryCardHeader, formatDate } from "../list/card-header.js"
import { buildHistoryCardBody } from "../list/card-rounds.js"
import {
    getHistorySessionPlayers,
    getHistoryTournamentPhases,
    getHistoryTournamentRuns,
    isMultiPhaseHistorySession,
} from "../summary/session-phases.js"
import { buildHistoryNightGroups } from "./model.js"

function buildChevronSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("class", "history-card-toggle")
    svg.setAttribute("viewBox", "0 0 24 24")
    svg.setAttribute("fill", "none")
    svg.setAttribute("stroke", "currentColor")
    svg.setAttribute("stroke-width", "2")
    svg.setAttribute("stroke-linecap", "round")
    svg.setAttribute("width", "20")
    svg.setAttribute("height", "20")
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
    polyline.setAttribute("points", "6 9 12 15 18 9")
    svg.appendChild(polyline)
    return svg
}

function buildSingleSessionCard(session, actions) {
    const card = document.createElement("div")
    card.className = "history-card"
    const dateStr = formatDate(session.date)
    const headerEl = buildHistoryCardHeader(session, dateStr)
    const sessionActions = typeof actions === "function" ? actions(session) : actions
    const body = buildHistoryCardBody(session, sessionActions)

    headerEl.addEventListener("click", () => {
        card.classList.toggle("expanded")
    })

    card.appendChild(headerEl)
    card.appendChild(body)
    return card
}

function buildNightDateLabel(group) {
    const firstDate = formatDate(group.date)
    const lastDate = formatDate(group.lastDate)
    return firstDate === lastDate ? firstDate : `${firstDate} -> ${lastDate}`
}

function buildNightGroupMeta(group) {
    const modeLabel = group.sessions[0] ? getModeLabel(group.sessions[0]) : "Tournament"
    const sessionLabel = group.sessions.length === 1 ? "1 saved session" : `${group.sessions.length} saved sessions`
    const tournamentLabel = `${group.tournamentCount} tournament${group.tournamentCount === 1 ? "" : "s"}`
    const roundLabel = `${group.roundCount} round${group.roundCount === 1 ? "" : "s"}`
    const playerLabel = `${group.playerCount} players`
    return `${playerLabel} · ${tournamentLabel} · ${roundLabel} · ${modeLabel} · ${sessionLabel}`
}

function buildNightGroupHeader(group) {
    const headerEl = document.createElement("div")
    headerEl.className = "history-card-header history-night-group-header"

    const info = document.createElement("div")
    info.className = "history-card-info"

    const dateSpan = document.createElement("span")
    dateSpan.className = "history-card-date"
    dateSpan.textContent = buildNightDateLabel(group)

    const meta = document.createElement("span")
    meta.className = "history-card-meta"
    meta.textContent = buildNightGroupMeta(group)

    info.appendChild(dateSpan)
    info.appendChild(meta)
    headerEl.appendChild(info)
    return headerEl
}

function buildNestedSessionMeta(session) {
    const playerCount = getHistorySessionPlayers(session).length
    const runs = getHistoryTournamentRuns(session)
    const tournamentCount = runs.length
    const roundCount = runs.reduce((sum, run) => sum + (run?.rounds?.length || 0), 0)
    let summary = `${playerCount} players · ${tournamentCount} tournament${tournamentCount === 1 ? "" : "s"} · ${roundCount} round${roundCount === 1 ? "" : "s"}`
    if (isMultiPhaseHistorySession(session)) {
        summary += ` · ${getHistoryTournamentPhases(session).length} phases`
    }
    return summary
}

function selectHeaderActions(actions) {
    if (!Array.isArray(actions) || actions.length === 0) {
        return []
    }
    const preferredLabels = ["Session Summary", "Detach From Night", "Reuse Latest Phase", "Reuse Players"]
    const selected = []
    for (const label of preferredLabels) {
        const action = actions.find((entry) => entry.label === label)
        if (action) {
            selected.push(action)
        }
        if (selected.length >= 2) {
            break
        }
    }
    return selected
}

function appendNestedSessionHeaderActions(container, actions, session) {
    const quickActions = selectHeaderActions(actions)
    if (quickActions.length === 0) {
        return
    }

    const row = document.createElement("div")
    row.className = "history-night-session-quick-actions"
    for (const action of quickActions) {
        const button = document.createElement("button")
        button.type = "button"
        button.className = `${action.className} history-night-session-action`
        button.textContent = action.label
        button.addEventListener("click", (event) => {
            event.stopPropagation()
            action.onClick(session)
        })
        row.appendChild(button)
    }
    container.appendChild(row)
}

function buildNestedSessionTitle(index) {
    if (index === 0) {
        return "Latest Session"
    }
    if (index === 1) {
        return "Previous Session"
    }
    return `Earlier Session ${index}`
}

function buildNestedSessionHeader(session, index, actions) {
    const header = document.createElement("div")
    header.className = "history-card-header history-night-session-header"

    const info = document.createElement("div")
    info.className = "history-card-info history-night-session-info"

    const title = document.createElement("span")
    title.className = "history-card-date history-night-session-title"
    title.textContent = `${buildNestedSessionTitle(index)} · ${formatDate(session.date)}`

    const meta = document.createElement("span")
    meta.className = "history-card-meta history-night-session-meta"
    meta.textContent = buildNestedSessionMeta(session)

    info.appendChild(title)
    info.appendChild(meta)
    header.appendChild(info)

    const controls = document.createElement("div")
    controls.className = "history-night-session-controls"
    appendNestedSessionHeaderActions(controls, actions, session)
    controls.appendChild(buildChevronSvg())
    header.appendChild(controls)

    return header
}

function buildNightSessionBlock(session, index, actions) {
    const block = document.createElement("section")
    block.className = "history-night-session history-card"

    const resolvedActions = typeof actions === "function" ? actions(session) : actions
    const bodyActions = filterNestedBodyActions(resolvedActions)
    const header = buildNestedSessionHeader(session, index, resolvedActions)
    const body = buildHistoryCardBody(session, bodyActions, { embedded: true })

    header.addEventListener("click", (event) => {
        event.stopPropagation()
        block.classList.toggle("expanded")
    })

    block.appendChild(header)
    block.appendChild(body)
    return block
}

function filterNestedBodyActions(actions) {
    if (!Array.isArray(actions)) {
        return actions
    }
    return actions.filter((action) => action.label !== "Session Summary" && action.label !== "Detach From Night")
}

function buildNightContextStrip(group) {
    const strip = document.createElement("div")
    strip.className = "history-night-context"
    strip.textContent = `${group.sessions.length} linked sessions · latest played session first`
    return strip
}

function buildNightGroupBody(group, actions, groupActions) {
    const body = document.createElement("div")
    body.className = "history-card-body history-night-body"
    body.appendChild(buildNightContextStrip(group))

    const sessionsWrap = document.createElement("div")
    sessionsWrap.className = "history-night-session-list"
    const visibleSessions = [...group.sessions].reverse()
    for (let index = 0; index < visibleSessions.length; index += 1) {
        sessionsWrap.appendChild(buildNightSessionBlock(visibleSessions[index], index, actions))
    }
    body.appendChild(sessionsWrap)

    const resolvedGroupActions = typeof groupActions === "function" ? groupActions(group) : groupActions
    if (Array.isArray(resolvedGroupActions) && resolvedGroupActions.length > 0) {
        const actionRow = document.createElement("div")
        actionRow.className = "history-actions history-night-actions"
        for (const action of resolvedGroupActions) {
            const button = document.createElement("button")
            button.type = "button"
            button.className = action.className
            button.textContent = action.label
            button.addEventListener("click", (event) => {
                event.stopPropagation()
                action.onClick(group)
            })
            actionRow.appendChild(button)
        }
        body.appendChild(actionRow)
    }

    return body
}

function renderGroupedHistoryCards({ actions, groupActions, list, sessions }) {
    const groups = buildHistoryNightGroups(sessions)
    for (const group of [...groups].reverse()) {
        if (group.sessions.length === 1) {
            list.appendChild(buildSingleSessionCard(group.sessions[0], actions))
            continue
        }
        const card = document.createElement("div")
        card.className = "history-card history-card-group"
        const headerEl = buildNightGroupHeader(group)
        const body = buildNightGroupBody(group, actions, groupActions)

        card.appendChild(headerEl)
        card.appendChild(body)
        list.appendChild(card)
    }
}

function hasLinkedNightGroups(sessions) {
    return buildHistoryNightGroups(sessions).some((group) => group.sessions.length > 1)
}

export { hasLinkedNightGroups, renderGroupedHistoryCards }
