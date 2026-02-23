/**
 * Tournament-specific rendering: bracket overview and standings table.
 */

import { computeStandings } from "./standings.js"
import { determineMatchWinner } from "./utils.js"

/**
 * Render a compact bracket overview showing past round results.
 * Appended below the current round's matches.
 */
function renderTournamentOverview(session, container) {
    if (session.rounds.length <= 1) {
        return
    }

    const overview = document.createElement("div")
    overview.className = "tournament-overview"

    const heading = document.createElement("h3")
    heading.className = "section-label"
    heading.textContent = "Bracket History"
    overview.appendChild(heading)

    for (let r = 0; r < session.rounds.length; r += 1) {
        const roundEl = renderRoundElement(session, session.rounds[r], r)
        overview.appendChild(roundEl)
    }

    container.appendChild(overview)
}

function formatScore(scoreEntry) {
    if (!scoreEntry?.sets || scoreEntry.sets.length === 0) {
        return "vs"
    }
    return scoreEntry.sets.map(([a, b]) => `${a}-${b}`).join(", ")
}

function renderRoundElement(session, round, r) {
    const isCurrent = r === (session.currentRound ?? 0)
    const roundEl = document.createElement("div")
    roundEl.className = `overview-round${isCurrent ? " overview-current" : ""}`

    const roundLabel = document.createElement("div")
    roundLabel.className = "overview-round-label"
    roundLabel.textContent = round.tournamentRoundLabel || `Round ${r + 1}`
    roundEl.appendChild(roundLabel)

    for (let m = 0; m < round.matches.length; m += 1) {
        const match = round.matches[m]
        const score = round.scores ? round.scores[m] : null
        renderMatchElement(session, match, score, roundEl)
    }

    // Show byes
    const allByes = [...(round.byes || []), ...(round.losersByes || [])]
    for (const byeId of allByes) {
        const team = session.teams.find((t) => t.id === byeId)
        if (!team) {
            continue
        }
        const byeEl = document.createElement("div")
        byeEl.className = "overview-match overview-bye"
        const nameEl = document.createElement("span")
        nameEl.className = "overview-team"
        nameEl.textContent = `${team.name} (bye)`
        byeEl.appendChild(nameEl)
        roundEl.appendChild(byeEl)
    }

    return roundEl
}

function renderMatchElement(session, match, score, container) {
    const winnerIdx = score ? determineMatchWinner(score) : null
    const matchEl = document.createElement("div")
    matchEl.className = "overview-match"

    const pool = match.bracketPool
    if (pool) {
        matchEl.classList.add(`overview-${pool}`)
    }

    for (let t = 0; t < match.teams.length; t += 1) {
        const teamEl = document.createElement("span")
        teamEl.className = "overview-team"
        if (winnerIdx === t) {
            teamEl.classList.add("overview-winner")
        }
        if (winnerIdx !== null && winnerIdx !== t) {
            teamEl.classList.add("overview-loser")
        }

        const team = match.teams[t]
        const teamObj = session.teams.find((tt) => {
            const key = [...tt.players].sort().join("||")
            return key === [...team].sort().join("||")
        })
        teamEl.textContent = teamObj ? teamObj.name : team.join(", ")
        matchEl.appendChild(teamEl)

        if (t < match.teams.length - 1) {
            const vs = document.createElement("span")
            vs.className = "overview-vs"
            vs.textContent = score ? formatScore(score) : "vs"
            matchEl.appendChild(vs)
        }
    }

    container.appendChild(matchEl)
}

/**
 * Render a standings table for round-robin tournaments.
 * Inserted before the match cards.
 */
function renderStandingsTable(teams, rounds, container) {
    const standings = computeStandings(teams, rounds)

    const wrapper = document.createElement("div")
    wrapper.className = "standings-wrapper"

    const heading = document.createElement("h3")
    heading.className = "section-label"
    heading.textContent = "Standings"
    wrapper.appendChild(heading)

    const table = document.createElement("table")
    table.className = "standings-table"

    const thead = document.createElement("thead")
    const headerRow = document.createElement("tr")
    for (const col of ["#", "Team", "W", "L", "Sets", "Games"]) {
        const th = document.createElement("th")
        th.textContent = col
        headerRow.appendChild(th)
    }
    thead.appendChild(headerRow)
    table.appendChild(thead)

    const tbody = document.createElement("tbody")
    standings.forEach((entry, i) => {
        const tr = document.createElement("tr")
        if (i === 0) {
            tr.classList.add("standings-leader")
        }

        const cells = [
            `${i + 1}`,
            entry.teamName,
            `${entry.wins}`,
            `${entry.losses}`,
            `${entry.setsWon}-${entry.setsLost}`,
            `${entry.gamesWon}-${entry.gamesLost}`,
        ]
        for (const val of cells) {
            const td = document.createElement("td")
            td.textContent = val
            tr.appendChild(td)
        }
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)

    wrapper.appendChild(table)
    container.appendChild(wrapper)
}

export { renderTournamentOverview, renderStandingsTable }
