import { getModeLabel } from "./utils.js"

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
    meta.textContent = `${session.players.length} players · ${roundCount} round${roundCount !== 1 ? "s" : ""} · ${modeLabel}`

    info.appendChild(dateSpan)
    info.appendChild(meta)
    headerEl.appendChild(info)
    headerEl.appendChild(buildChevronSvg())

    return headerEl
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

function getScoreForMatch(round, matchIndex, court) {
    if (!round.scores) {
        return null
    }

    const direct = round.scores[matchIndex]
    if (direct?.score) {
        return direct.score
    }

    for (const entry of round.scores) {
        if (entry && entry.court === court) {
            return entry.score
        }
    }

    return null
}

function appendHistoryScore(teamsGrid, score) {
    const el = document.createElement("div")
    el.className = "history-score"
    el.textContent = `Score: ${score[0]} - ${score[1]}`
    teamsGrid.appendChild(el)
}

function renderStructuredRound(round, teamsGrid) {
    for (let i = 0; i < round.matches.length; i += 1) {
        const match = round.matches[i]

        if (round.matches.length > 1) {
            const courtLabel = document.createElement("div")
            courtLabel.className = "history-team-name"
            courtLabel.textContent = `Court ${match.court}`
            courtLabel.style.gridColumn = "1 / -1"
            teamsGrid.appendChild(courtLabel)
        }

        renderTeamsToGrid(match.teams, teamsGrid)

        const score = getScoreForMatch(round, i, match.court)
        if (score) {
            appendHistoryScore(teamsGrid, score)
        }
    }

    if (round.sitOuts && round.sitOuts.length > 0) {
        const sitOutDiv = document.createElement("div")
        sitOutDiv.className = "history-team"
        const sitOutLabel = document.createElement("div")
        sitOutLabel.className = "history-team-name"
        sitOutLabel.style.color = "var(--text-muted)"
        sitOutLabel.textContent = "Sat out"
        const sitOutPlayers = document.createElement("div")
        sitOutPlayers.className = "history-team-players"
        sitOutPlayers.textContent = round.sitOuts.join(", ")
        sitOutDiv.appendChild(sitOutLabel)
        sitOutDiv.appendChild(sitOutPlayers)
        teamsGrid.appendChild(sitOutDiv)
    }
}

function buildHistoryRound(round, index) {
    const roundDiv = document.createElement("div")
    roundDiv.className = "history-round"

    const roundLabel = document.createElement("div")
    roundLabel.className = "history-round-label"
    roundLabel.textContent = `Round ${index + 1}`

    const teamsGrid = document.createElement("div")
    teamsGrid.className = "history-round-teams"

    if (round.matches) {
        renderStructuredRound(round, teamsGrid)
    } else {
        renderTeamsToGrid(round, teamsGrid)
    }

    roundDiv.appendChild(roundLabel)
    roundDiv.appendChild(teamsGrid)
    return roundDiv
}

function buildHistoryCardBody(session, onDelete) {
    const body = document.createElement("div")
    body.className = "history-card-body"

    for (let r = 0; r < session.rounds.length; r += 1) {
        body.appendChild(buildHistoryRound(session.rounds[r], r))
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
