import { getModeLabel } from "../../../ui/common/utils.js"
import { buildHistoryActionButton, buildHistoryActionRow } from "../list/action-buttons.js"
import { buildHistoryCardMeta, formatDate } from "../list/card-header.js"
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
    headerEl.className = "history-night-group-header"

    const info = document.createElement("div")
    info.className = "history-night-group-info"

    const dateSpan = document.createElement("span")
    dateSpan.className = "history-night-group-date"
    dateSpan.textContent = buildNightDateLabel(group)

    const meta = document.createElement("span")
    meta.className = "history-night-group-meta"
    meta.textContent = buildNightGroupMeta(group)

    info.appendChild(dateSpan)
    info.appendChild(meta)
    headerEl.appendChild(info)
    return headerEl
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

function appendSessionQuickActions(container, actions, session) {
    const quickActions = selectHeaderActions(actions)
    if (quickActions.length === 0) {
        return
    }

    const row = document.createElement("div")
    row.className = "history-card-quick-actions"
    for (const action of quickActions) {
        row.appendChild(
            buildHistoryActionButton(action, session, {
                extraClass: "history-card-quick-action",
                stopPropagation: true,
            }),
        )
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
    return `Earlier Session ${index + 1}`
}

function appendProvisionalBadge(container, session) {
    if (!session?.provisional) {
        return
    }
    const badge = document.createElement("span")
    badge.className = "history-card-badge"
    badge.textContent = "Live"
    container.appendChild(document.createTextNode(" "))
    container.appendChild(badge)
}

function buildSessionOpenButton(session, label, onOpen) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "history-card-open"

    const title = document.createElement("span")
    title.className = "history-card-date"
    title.textContent = label ? `${label} · ${formatDate(session.date)}` : formatDate(session.date)
    appendProvisionalBadge(title, session)

    const meta = document.createElement("span")
    meta.className = "history-card-meta"
    meta.textContent = buildHistoryCardMeta(session)

    const info = document.createElement("span")
    info.className = "history-card-info"
    info.appendChild(title)
    info.appendChild(meta)

    button.appendChild(info)

    const chevron = document.createElement("div")
    chevron.className = "history-card-open-icon"
    chevron.appendChild(buildChevronSvg())
    button.appendChild(chevron)

    button.addEventListener("click", () => onOpen?.())

    return button
}

function buildSessionCard({ actions, label = "", onOpenSessionDetails, session }) {
    const card = document.createElement("article")
    card.className = "history-card history-session-card"

    const resolvedActions = typeof actions === "function" ? actions(session) : actions
    const open = () => onOpenSessionDetails?.(session, filterModalActions(resolvedActions))

    card.appendChild(buildSessionOpenButton(session, label, open))
    appendSessionQuickActions(card, resolvedActions, session)
    return card
}

function filterModalActions(actions) {
    if (!Array.isArray(actions)) {
        return actions
    }
    return actions.filter((action) => action.label !== "Session Summary")
}

function buildNightContextStrip(group) {
    const strip = document.createElement("div")
    strip.className = "history-night-context"
    strip.textContent = `${group.sessions.length} linked sessions · latest played session first`
    return strip
}

function buildNightGroupBody({ actions, group, groupActions, onOpenSessionDetails }) {
    const body = document.createElement("div")
    body.className = "history-night-body"
    body.appendChild(buildNightContextStrip(group))

    const sessionsWrap = document.createElement("div")
    sessionsWrap.className = "history-night-session-list"
    const visibleSessions = [...group.sessions].reverse()
    for (let index = 0; index < visibleSessions.length; index += 1) {
        sessionsWrap.appendChild(
            buildSessionCard({
                actions,
                label: buildNestedSessionTitle(index),
                onOpenSessionDetails,
                session: visibleSessions[index],
            }),
        )
    }
    body.appendChild(sessionsWrap)

    const resolvedGroupActions = typeof groupActions === "function" ? groupActions(group) : groupActions
    const actionRow = buildHistoryActionRow(group, resolvedGroupActions, {
        rowClassName: "history-actions history-night-actions",
        stopPropagation: true,
    })
    if (actionRow) {
        body.appendChild(actionRow)
    }

    return body
}

function renderGroupedHistoryCards({ actions, groupActions, list, onOpenSessionDetails, sessions }) {
    const groups = buildHistoryNightGroups(sessions)
    for (const group of [...groups].reverse()) {
        if (group.sessions.length === 1) {
            list.appendChild(
                buildSessionCard({
                    actions,
                    onOpenSessionDetails,
                    session: group.sessions[0],
                }),
            )
            continue
        }
        const card = document.createElement("section")
        card.className = "history-night-group"
        const headerEl = buildNightGroupHeader(group)
        const body = buildNightGroupBody({ actions, group, groupActions, onOpenSessionDetails })

        card.appendChild(headerEl)
        card.appendChild(body)
        list.appendChild(card)
    }
}

function hasLinkedNightGroups(sessions) {
    return buildHistoryNightGroups(sessions).some((group) => group.sessions.length > 1)
}

export { hasLinkedNightGroups, renderGroupedHistoryCards }
