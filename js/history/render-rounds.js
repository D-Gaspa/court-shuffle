import { formatSets } from "../score-editor/sets.js"
import { determineMatchWinner } from "../tournament/utils.js"
import { getScoredTournamentRuns } from "./render-header.js"

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

function getScoreEntryForMatch(round, matchIndex) {
    if (!round.scores) {
        return null
    }
    const entry = round.scores[matchIndex]
    if (!entry) {
        return null
    }
    if (entry.sets && entry.sets.length > 0) {
        return entry
    }
    if (Array.isArray(entry.score) && entry.score.length === 2) {
        return {
            ...entry,
            sets: [entry.score],
        }
    }
    return null
}

function getSetsForMatch(round, matchIndex) {
    const entry = getScoreEntryForMatch(round, matchIndex)
    return entry?.sets || null
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

function buildMatchTeamRow(players, index, winnerIdx) {
    const row = createDiv("history-match-team")
    if (winnerIdx === index) {
        row.classList.add("history-match-team-winner")
    } else if (winnerIdx !== null) {
        row.classList.add("history-match-team-loser")
    }
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

    const scoreEntry = getScoreEntryForMatch(round, matchIndex)
    const winnerIdx = scoreEntry ? determineMatchWinner(scoreEntry) : null
    const teamList = createDiv("history-match-teams")
    for (let i = 0; i < match.teams.length; i += 1) {
        teamList.appendChild(buildMatchTeamRow(match.teams[i], i, winnerIdx))
    }
    card.appendChild(teamList)

    const sets = getSetsForMatch(round, matchIndex)
    if (sets) {
        appendHistorySets(card, sets)
    } else {
        card.appendChild(createDiv("history-score muted", "No score"))
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
        return roundDiv
    }

    const teamsGrid = document.createElement("div")
    teamsGrid.className = "history-round-teams"
    renderTeamsToGrid(round, teamsGrid)
    roundDiv.appendChild(teamsGrid)
    return roundDiv
}

function appendTournamentRun(body, run, index, total) {
    const title = document.createElement("div")
    title.className = "history-round-label"
    title.textContent = `Tournament ${index + 1} of ${total}`
    body.appendChild(title)

    const runMeta = document.createElement("div")
    runMeta.className = "history-round-content"
    appendChipGroup(runMeta, "Tournament sit-out", run.tournamentLevelSitOuts || [])
    if (runMeta.childElementCount > 0) {
        body.appendChild(runMeta)
    }

    for (let r = 0; r < (run.rounds?.length || 0); r += 1) {
        body.appendChild(buildHistoryRound(run, run.rounds[r], r))
    }
}

function buildHistoryCardBody(session, onDelete) {
    const body = document.createElement("div")
    body.className = "history-card-body"

    const scoredSeriesRuns = getScoredTournamentRuns(session)
    if (scoredSeriesRuns && scoredSeriesRuns.length > 0) {
        for (let ti = 0; ti < scoredSeriesRuns.length; ti += 1) {
            appendTournamentRun(body, scoredSeriesRuns[ti], ti, scoredSeriesRuns.length)
        }
    } else {
        for (let r = 0; r < session.rounds.length; r += 1) {
            body.appendChild(buildHistoryRound(session, session.rounds[r], r))
        }
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

export { buildHistoryCardBody }
