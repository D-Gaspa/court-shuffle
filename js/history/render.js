import { formatSets } from "../score-editor/sets.js"
import { getModeLabel } from "../utils.js"

function formatDate(isoString) {
    try {
        const d = new Date(isoString)
        return d.toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    } catch {
        return isoString
    }
}

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

function buildHistoryCardHeader(session, dateStr) {
    const headerEl = document.createElement("div")
    headerEl.className = "history-card-header"

    const info = document.createElement("div")
    info.className = "history-card-info"

    const dateSpan = document.createElement("span")
    dateSpan.className = "history-card-date"
    dateSpan.textContent = dateStr

    const meta = document.createElement("span")
    meta.className = "history-card-meta"
    const roundCount = session.rounds.length
    const modeLabel = getModeLabel(session)
    let metaText = `${session.players.length} players · ${roundCount} round${roundCount !== 1 ? "s" : ""} · ${modeLabel}`

    if (
        session.mode === "tournament" &&
        session.bracket?.champion !== null &&
        session.bracket?.champion !== undefined
    ) {
        const champion = session.teams?.find((t) => t.id === session.bracket.champion)
        if (champion) {
            metaText += ` · Champion: ${champion.name}`
        }
    }
    meta.textContent = metaText

    info.appendChild(dateSpan)
    info.appendChild(meta)
    headerEl.appendChild(info)
    headerEl.appendChild(buildChevronSvg())

    return headerEl
}

function createDiv(className, text) {
    const el = document.createElement("div")
    el.className = className
    if (text !== undefined) {
        el.textContent = text
    }
    return el
}

function renderTeamsToGrid(teams, grid) {
    let ti = 0
    while (ti < teams.length) {
        const teamDiv = document.createElement("div")
        teamDiv.className = "history-team"

        const teamName = document.createElement("div")
        teamName.className = "history-team-name"
        teamName.textContent = `Team ${ti + 1}`

        const teamPlayers = document.createElement("div")
        teamPlayers.className = "history-team-players"
        teamPlayers.textContent = teams[ti].join(", ")

        teamDiv.appendChild(teamName)
        teamDiv.appendChild(teamPlayers)
        grid.appendChild(teamDiv)
        ti += 1
    }
}

function getSetsForMatch(round, matchIndex) {
    if (!round.scores) {
        return null
    }
    const entry = round.scores[matchIndex]
    if (!entry) {
        return null
    }
    if (entry.sets && entry.sets.length > 0) {
        return entry.sets
    }
    // backward compatibility: old single-score format [a, b]
    if (Array.isArray(entry.score) && entry.score.length === 2) {
        return [entry.score]
    }
    return null
}

function appendHistorySets(container, sets) {
    const el = document.createElement("div")
    const text = formatSets(sets)
    el.className = text ? "history-score" : "history-score muted"
    el.textContent = text || "No score"
    container.appendChild(el)
}

function buildPoolBadge(pool) {
    if (!pool) {
        return null
    }
    const label = pool === "losers" ? "Losers" : "Winners"
    const badge = document.createElement("span")
    badge.className = `history-pool-badge ${pool === "losers" ? "losers" : "winners"}`
    badge.textContent = label
    return badge
}

function buildMatchTeamRow(players, index) {
    const row = createDiv("history-match-team")
    row.appendChild(createDiv("history-match-team-label", `Team ${index + 1}`))
    row.appendChild(createDiv("history-match-team-players", players.join(", ")))
    return row
}

function buildMatchCard(round, match, matchIndex) {
    const card = createDiv("history-match")

    const header = createDiv("history-match-header")
    header.appendChild(createDiv("history-match-court", `Court ${match.court || matchIndex + 1}`))
    const badge = buildPoolBadge(match.bracketPool)
    if (badge) {
        header.appendChild(badge)
    }
    card.appendChild(header)

    const teamList = createDiv("history-match-teams")
    for (let i = 0; i < match.teams.length; i += 1) {
        teamList.appendChild(buildMatchTeamRow(match.teams[i], i))
    }
    card.appendChild(teamList)

    const sets = getSetsForMatch(round, matchIndex)
    if (sets) {
        appendHistorySets(card, sets)
    } else {
        const noScore = createDiv("history-score muted", "No score")
        card.appendChild(noScore)
    }

    return card
}

function resolveByeTeamNames(session, round) {
    if (!session?.teams) {
        return []
    }
    const byeIds = [...(round.byes || []), ...(round.losersByes || [])]
    return byeIds.map((id) => session.teams.find((team) => team.id === id)?.name || null).filter(Boolean)
}

function appendChipGroup(container, label, values) {
    if (!values || values.length === 0) {
        return
    }
    const group = createDiv("history-chip-group")
    group.appendChild(createDiv("history-chip-label", label))

    const list = createDiv("history-chip-list")
    for (const value of values) {
        list.appendChild(createDiv("history-chip", value))
    }

    group.appendChild(list)
    container.appendChild(group)
}

function renderStructuredRound(session, round, container) {
    const matchList = createDiv("history-match-list")
    for (let i = 0; i < round.matches.length; i += 1) {
        matchList.appendChild(buildMatchCard(round, round.matches[i], i))
    }
    container.appendChild(matchList)

    const meta = createDiv("history-round-meta")
    appendChipGroup(meta, "Byes", resolveByeTeamNames(session, round))
    appendChipGroup(meta, "Sat out", round.sitOuts || [])
    if (meta.childElementCount > 0) {
        container.appendChild(meta)
    }
}

function buildHistoryRound(session, round, index) {
    const roundDiv = document.createElement("div")
    roundDiv.className = "history-round"

    const roundLabel = document.createElement("div")
    roundLabel.className = "history-round-label"
    roundLabel.textContent = round.tournamentRoundLabel || `Round ${index + 1}`
    roundDiv.appendChild(roundLabel)

    if (round.matches) {
        const content = document.createElement("div")
        content.className = "history-round-content"
        renderStructuredRound(session, round, content)
        roundDiv.appendChild(content)
    } else {
        const teamsGrid = document.createElement("div")
        teamsGrid.className = "history-round-teams"
        renderTeamsToGrid(round, teamsGrid)
        roundDiv.appendChild(teamsGrid)
    }
    return roundDiv
}

function buildHistoryCardBody(session, onDelete) {
    const body = document.createElement("div")
    body.className = "history-card-body"

    for (let r = 0; r < session.rounds.length; r += 1) {
        body.appendChild(buildHistoryRound(session, session.rounds[r], r))
    }

    const deleteRow = document.createElement("div")
    deleteRow.className = "history-delete"
    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.className = "btn btn-ghost btn-sm btn-danger"
    deleteBtn.textContent = "Delete Session"
    deleteBtn.addEventListener("click", () => onDelete(session.id))
    deleteRow.appendChild(deleteBtn)
    body.appendChild(deleteRow)

    return body
}

export function renderHistory(history, container, emptyState, onDelete) {
    container.textContent = ""

    if (history.length === 0) {
        container.hidden = true
        emptyState.hidden = false
        return
    }

    container.hidden = false
    emptyState.hidden = true

    const sorted = [...history].reverse()

    for (const session of sorted) {
        const card = document.createElement("div")
        card.className = "history-card"

        const dateStr = formatDate(session.date)
        const headerEl = buildHistoryCardHeader(session, dateStr)
        const body = buildHistoryCardBody(session, onDelete)

        headerEl.addEventListener("click", () => {
            card.classList.toggle("expanded")
        })

        card.appendChild(headerEl)
        card.appendChild(body)
        container.appendChild(card)
    }
}
