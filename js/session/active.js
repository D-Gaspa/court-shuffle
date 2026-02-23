import { renderStandingsTable, renderTournamentOverview } from "../tournament/render.js"
import { allScoresEntered } from "../tournament/utils.js"
import { getModeLabel } from "../utils.js"
import { renderBracket, renderSitOuts } from "./render.js"

function renderActiveSession(state, saveState, ui) {
    const session = state.activeSession
    if (!session) {
        return
    }

    const current = session.currentRound ?? session.rounds.length - 1
    const total = session.rounds.length
    const isLast = current >= total - 1
    const round = session.rounds[current]

    const modeLabel = getModeLabel(session)
    const courts = (session.courtCount || 1) > 1 ? ` · ${session.courtCount} courts` : ""
    ui.roundInfo.textContent = `${session.players.length} players · ${modeLabel}${courts}`

    // Hide modify players for tournament mode
    if (ui.modifyPlayersBtn) {
        ui.modifyPlayersBtn.hidden = session.mode === "tournament"
    }

    const roundInfo = { round, current, total, isLast }
    if (session.mode === "tournament") {
        renderTournamentActive(session, roundInfo, saveState, ui)
    } else {
        renderStandardActive(session, roundInfo, saveState, ui)
    }
}

function renderStandardActive(_session, roundInfo, saveState, ui) {
    ui.roundNumber.textContent = roundInfo.current + 1
    ui.roundTotal.textContent = roundInfo.total

    renderBracket(roundInfo.round, ui.bracketContainer, {
        editable: true,
        onCommit: (matchIndex, sets) => {
            commitScore(roundInfo.round, matchIndex, sets, saveState)
        },
    })

    renderSitOutsSection(roundInfo.round, ui)

    ui.prevRoundBtn.disabled = roundInfo.current <= 0
    ui.nextRoundBtn.disabled = roundInfo.isLast
    ui.nextRoundLabel.textContent = "Next Round"
    ui.noMoreRounds.hidden = !roundInfo.isLast
}

function updateTournamentNavigation(session, navState, ui) {
    const isBracketTournament = !session.allRoundsGenerated
    const isAtFrontier = navState.current === session.rounds.length - 1
    const isTournamentOver = session.bracket?.champion !== null && session.bracket?.champion !== undefined

    ui.prevRoundBtn.disabled = navState.current <= 0

    if (isBracketTournament) {
        if (isTournamentOver) {
            updateTournamentCompleteUi(session, ui)
        } else if (isAtFrontier) {
            ui.nextRoundBtn.disabled = !navState.scoresComplete
            ui.nextRoundLabel.textContent = navState.scoresComplete ? "Advance Round" : "Enter all scores"
            ui.noMoreRounds.hidden = true
        } else {
            ui.nextRoundBtn.disabled = false
            ui.nextRoundLabel.textContent = "Next Round"
            ui.noMoreRounds.hidden = true
        }
    } else {
        ui.nextRoundBtn.disabled = navState.isLast
        ui.nextRoundLabel.textContent = "Next Round"
        ui.noMoreRounds.hidden = !navState.isLast
    }
}

function updateTournamentCompleteUi(session, ui) {
    ui.nextRoundBtn.disabled = true
    ui.noMoreRounds.hidden = false
    const champion = session.teams.find((t) => t.id === session.bracket.champion)
    const bannerEl = ui.noMoreRounds.querySelector("span") || ui.noMoreRounds
    bannerEl.textContent = champion ? `Tournament complete! Champion: ${champion.name}` : "Tournament complete!"
}

function renderTournamentActive(session, roundInfo, saveState, ui) {
    const roundLabel = roundInfo.round.tournamentRoundLabel || `Round ${roundInfo.current + 1}`
    ui.roundNumber.textContent = roundLabel
    ui.roundTotal.textContent = roundInfo.total

    renderTournamentRound(session, roundInfo.round, saveState, ui)

    if (session.tournamentFormat === "round-robin") {
        renderStandingsTable(session.teams, session.rounds, ui.bracketContainer)
    } else {
        renderTournamentOverview(session, ui.bracketContainer)
    }

    renderSitOutsSection(roundInfo.round, ui)

    const scoresComplete = allScoresEntered(roundInfo.round)
    const navState = { current: roundInfo.current, isLast: roundInfo.isLast, scoresComplete }
    updateTournamentNavigation(session, navState, ui)
}

function renderTournamentRound(session, round, saveState, ui) {
    ui.bracketContainer.textContent = ""

    // For consolation, show pool labels above the matches
    if (session.tournamentFormat === "consolation" || session.tournamentFormat === "elimination") {
        const winnersMatches = []
        const losersMatches = []
        const matchIndices = { winners: [], losers: [] }

        for (let i = 0; i < round.matches.length; i += 1) {
            const pool = round.matches[i].bracketPool || "winners"
            if (pool === "losers") {
                losersMatches.push(round.matches[i])
                matchIndices.losers.push(i)
            } else {
                winnersMatches.push(round.matches[i])
                matchIndices.winners.push(i)
            }
        }

        if (winnersMatches.length > 0) {
            const label = document.createElement("h3")
            label.className = "bracket-pool-label winners-label"
            label.textContent = session.tournamentFormat === "consolation" ? "Winners Bracket" : "Bracket"
            ui.bracketContainer.appendChild(label)

            renderMatchGroup({
                matches: winnersMatches,
                indices: matchIndices.winners,
                round,
                saveState,
                container: ui.bracketContainer,
            })
        }

        if (losersMatches.length > 0) {
            const label = document.createElement("h3")
            label.className = "bracket-pool-label losers-label"
            label.textContent = "Losers Bracket"
            ui.bracketContainer.appendChild(label)

            renderMatchGroup({
                matches: losersMatches,
                indices: matchIndices.losers,
                round,
                saveState,
                container: ui.bracketContainer,
            })
        }

        // Show byes
        renderByeInfo(round, session.teams, ui.bracketContainer)
    } else {
        // Round-robin or generic: render all matches normally
        renderBracket(round, ui.bracketContainer, {
            editable: true,
            onCommit: (matchIndex, sets) => {
                commitScore(round, matchIndex, sets, saveState)
            },
        })
    }
}

function renderMatchGroup(opts) {
    for (let j = 0; j < opts.matches.length; j += 1) {
        const match = opts.matches[j]
        const globalIdx = opts.indices[j]
        const scoreEntry = opts.round.scores ? opts.round.scores[globalIdx] : null

        const tempRound = {
            matches: [{ ...match, court: j + 1 }],
            scores: scoreEntry ? [scoreEntry] : null,
        }

        renderBracket(tempRound, opts.container, {
            editable: true,
            onCommit: (_, sets) => {
                commitScore(opts.round, globalIdx, sets, opts.saveState)
            },
        })
    }
}

function renderByeInfo(round, teams, container) {
    const allByes = [...(round.byes || []), ...(round.losersByes || [])]
    if (allByes.length === 0) {
        return
    }

    const byeSection = document.createElement("div")
    byeSection.className = "bye-info"

    const label = document.createElement("h3")
    label.className = "section-label"
    label.textContent = "Byes (auto-advance)"
    byeSection.appendChild(label)

    const list = document.createElement("div")
    list.className = "bye-list"
    for (const teamId of allByes) {
        const team = teams.find((t) => t.id === teamId)
        if (!team) {
            continue
        }
        const chip = document.createElement("div")
        chip.className = "bye-chip"
        chip.textContent = team.name
        list.appendChild(chip)
    }
    byeSection.appendChild(list)
    container.appendChild(byeSection)
}

function commitScore(round, matchIndex, sets, saveState) {
    if (!round.scores) {
        round.scores = round.matches.map(() => null)
    }
    if (sets) {
        round.scores[matchIndex] = {
            court: round.matches[matchIndex].court,
            sets,
        }
    } else {
        round.scores[matchIndex] = null
    }
    saveState()
}

function renderSitOutsSection(round, ui) {
    if (round.sitOuts && round.sitOuts.length > 0) {
        ui.sitOutContainer.hidden = false
        renderSitOuts(round.sitOuts, ui.sitOutList)
    } else {
        ui.sitOutContainer.hidden = true
    }
}

function endSession(state, saveState, save) {
    if (save) {
        const session = state.activeSession
        if (session) {
            const playedRounds = session.rounds.filter((round) => round.scores?.some((s) => s !== null) ?? false)
            const historyEntry = {
                id: session.id,
                date: session.date,
                players: session.players,
                teamCount: session.teamCount,
                mode: session.mode || "free",
                courtCount: session.courtCount || 1,
                rounds: session.mode === "tournament" ? session.rounds : playedRounds,
            }
            if (session.mode === "tournament") {
                historyEntry.tournamentFormat = session.tournamentFormat
                historyEntry.tournamentTeamSize = session.tournamentTeamSize
                historyEntry.teams = session.teams
                historyEntry.bracket = session.bracket
            }
            state.history.push(historyEntry)
        }
    }
    state.activeSession = null
    saveState()
}

export { renderActiveSession, endSession }
