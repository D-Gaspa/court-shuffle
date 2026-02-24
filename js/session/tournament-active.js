import { advanceTournament } from "../tournament/bracket.js"
import { renderStandingsTable, renderTournamentOverview } from "../tournament/render.js"
import { getRoundScoreBlockReason, teamByPlayers } from "../tournament/utils.js"
import { renderBracket } from "./render.js"

function updateTournamentNavigation(session, navState, ui) {
    const isBracketTournament = !session.allRoundsGenerated
    const isAtFrontier = navState.current === session.rounds.length - 1
    const hasChampion = session.bracket?.champion !== null && session.bracket?.champion !== undefined
    const isTournamentOver = hasChampion || session.tournamentComplete === true

    ui.prevRoundBtn.disabled = navState.current <= 0

    if (isBracketTournament) {
        updateBracketTournamentNavigation({ session, navState, ui, isTournamentOver, isAtFrontier })
        return
    }

    updatePreGeneratedTournamentNavigation({ navState, ui, round: session.rounds[navState.current] })
}

function updateBracketTournamentNavigation({ session, navState, ui, isTournamentOver, isAtFrontier }) {
    if (isTournamentOver) {
        updateTournamentCompleteUi(session, ui)
        return
    }

    if (isAtFrontier) {
        updateFrontierTournamentNavigation({ session, navState, ui })
        return
    }

    ui.nextRoundBtn.disabled = false
    ui.nextRoundLabel.textContent = "Next Round"
    ui.noMoreRounds.hidden = true
}

function updateFrontierTournamentNavigation({ session, navState, ui }) {
    const endsTournamentOnAdvance = navState.scoresComplete && wouldCompleteTournamentOnAdvance(session)
    ui.nextRoundBtn.disabled = !navState.scoresComplete
    if (navState.scoresComplete) {
        ui.nextRoundLabel.textContent = endsTournamentOnAdvance ? "End Tournament" : "Advance Round"
    } else {
        ui.nextRoundLabel.textContent = getTournamentBlockedLabel(session.rounds[navState.current])
    }
    ui.noMoreRounds.hidden = true
}

function updatePreGeneratedTournamentNavigation({ navState, ui, round }) {
    if (navState.isLast) {
        ui.nextRoundBtn.disabled = true
        ui.nextRoundLabel.textContent = "Next Round"
        ui.noMoreRounds.hidden = false
        return
    }

    ui.nextRoundBtn.disabled = !navState.scoresComplete
    ui.nextRoundLabel.textContent = navState.scoresComplete ? "Next Round" : getTournamentBlockedLabel(round)
    ui.noMoreRounds.hidden = true
}

function cloneSessionForAdvancePreview(session) {
    if (typeof structuredClone === "function") {
        return structuredClone(session)
    }
    return JSON.parse(JSON.stringify(session))
}

function wouldCompleteTournamentOnAdvance(session) {
    const previewSession = cloneSessionForAdvancePreview(session)
    return advanceTournament(previewSession) === null
}

function getTournamentBlockedLabel(round) {
    return getRoundScoreBlockReason(round) || "Enter all scores"
}

function updateTournamentCompleteUi(session, ui) {
    ui.nextRoundBtn.disabled = false
    ui.nextRoundLabel.textContent = "End Tournament"
    ui.noMoreRounds.hidden = false
    const champion = session.teams.find((t) => t.id === session.bracket.champion)
    const bannerEl = ui.noMoreRounds.querySelector("span") || ui.noMoreRounds
    bannerEl.textContent = champion ? `Tournament complete! Champion: ${champion.name}` : "Tournament complete!"
}

function makeTeamNameResolver(session) {
    return (players) => {
        const team = teamByPlayers(session.teams, players)
        return team ? team.name : players.join(", ")
    }
}

function splitTournamentMatchesByPool(round) {
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

    return { winnersMatches, losersMatches, matchIndices }
}

function renderMatchGroup({ matches, indices, round, saveState, container, teamNames, refreshNav, commitScore }) {
    for (let j = 0; j < matches.length; j += 1) {
        const match = matches[j]
        const globalIdx = indices[j]
        const scoreEntry = round.scores ? round.scores[globalIdx] : null

        const tempRound = {
            matches: [match],
            scores: scoreEntry ? [scoreEntry] : null,
        }

        const matchDiv = document.createElement("div")
        container.appendChild(matchDiv)

        renderBracket(tempRound, matchDiv, {
            editable: true,
            onCommit: (_, sets) => {
                commitScore({
                    round,
                    matchIndex: globalIdx,
                    sets,
                    saveState,
                    onAfterSave: refreshNav,
                })
            },
            teamNames,
        })
    }
}

function renderTournamentPoolSections({ session, round, saveState, container, teamNames, refreshNav, commitScore }) {
    const { winnersMatches, losersMatches, matchIndices } = splitTournamentMatchesByPool(round)

    if (winnersMatches.length > 0) {
        const label = document.createElement("h3")
        label.className = "bracket-pool-label winners-label"
        label.textContent = session.tournamentFormat === "consolation" ? "Winners Bracket" : "Bracket"
        container.appendChild(label)

        renderMatchGroup({
            matches: winnersMatches,
            indices: matchIndices.winners,
            round,
            saveState,
            container,
            teamNames,
            refreshNav,
            commitScore,
        })
    }

    if (losersMatches.length > 0) {
        const label = document.createElement("h3")
        label.className = "bracket-pool-label losers-label"
        label.textContent = "Losers Bracket"
        container.appendChild(label)

        renderMatchGroup({
            matches: losersMatches,
            indices: matchIndices.losers,
            round,
            saveState,
            container,
            teamNames,
            refreshNav,
            commitScore,
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

function renderTournamentRound({ session, round, saveState, ui, refreshNav, commitScore }) {
    ui.bracketContainer.textContent = ""
    const teamNames = makeTeamNameResolver(session)

    if (session.tournamentFormat === "consolation" || session.tournamentFormat === "elimination") {
        renderTournamentPoolSections({
            session,
            round,
            saveState,
            container: ui.bracketContainer,
            teamNames,
            refreshNav,
            commitScore,
        })
        renderByeInfo(round, session.teams, ui.bracketContainer)
        return
    }

    renderBracket(round, ui.bracketContainer, {
        editable: true,
        onCommit: (matchIndex, sets) => {
            commitScore({ round, matchIndex, sets, saveState, onAfterSave: refreshNav })
        },
        teamNames,
    })
}

export function renderTournamentActive({ session, roundInfo, saveState, ui, commitScore, renderSitOutsSection }) {
    const roundLabel = roundInfo.round.tournamentRoundLabel || `Round ${roundInfo.current + 1}`
    if (ui.roundPrefix) {
        ui.roundPrefix.hidden = true
    }
    ui.roundNumber.textContent = roundLabel
    ui.roundTotal.textContent = roundInfo.total

    const refreshNav = () => {
        const scoreBlockReason = getRoundScoreBlockReason(roundInfo.round)
        const scoresComplete = scoreBlockReason === null
        const navState = { current: roundInfo.current, isLast: roundInfo.isLast, scoresComplete }
        updateTournamentNavigation(session, navState, ui)
    }

    renderTournamentRound({ session, round: roundInfo.round, saveState, ui, refreshNav, commitScore })

    if (session.tournamentFormat === "round-robin") {
        renderStandingsTable(session.teams, session.rounds, ui.bracketContainer)
    } else {
        renderTournamentOverview(session, ui.bracketContainer)
    }

    renderSitOutsSection(roundInfo.round, ui)
    refreshNav()
}
