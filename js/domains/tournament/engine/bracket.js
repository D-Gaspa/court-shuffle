/**
 * Bracket advancement — elimination and consolation formats.
 */

import { determineMatchWinner, teamById, teamByPlayers } from "./utils.js"

// ── Shared helpers ──────────────────────────────────────────────

function collectMatchOutcomes(matchList, scores, teams) {
    const winners = []
    const losers = []
    for (const { match, scoreIdx } of matchList) {
        const winIdx = determineMatchWinner(scores[scoreIdx])
        if (winIdx === null) {
            return null
        }
        const loseIdx = winIdx === 0 ? 1 : 0
        const winTeam = teamByPlayers(teams, match.teams[winIdx])
        const loseTeam = teamByPlayers(teams, match.teams[loseIdx])
        if (winTeam) {
            winners.push(winTeam)
        }
        if (loseTeam) {
            losers.push(loseTeam)
        }
    }
    return { winners, losers }
}

function buildPairedMatches(advancing, pool) {
    const matches = []
    const byes = []

    if (advancing.length < 2) {
        return { matches, byes }
    }

    if (advancing.length % 2 !== 0) {
        byes.push(advancing.at(-1).id)
    }
    const pairable = advancing.length % 2 !== 0 ? advancing.slice(0, -1) : advancing
    for (let i = 0; i < pairable.length; i += 2) {
        const entry = {
            court: matches.length + 1,
            teams: [pairable[i].players, pairable[i + 1].players],
            teamIds: [pairable[i].id, pairable[i + 1].id],
        }
        if (pool) {
            entry.bracketPool = pool
        }
        matches.push(entry)
    }

    return { matches, byes }
}

function markEliminated(bracket, teamIds) {
    for (const id of teamIds) {
        if (!bracket.eliminated.includes(id)) {
            bracket.eliminated.push(id)
        }
    }
}

// ── Single Elimination ──────────────────────────────────────────

function advanceElimination(session) {
    const lastRound = session.rounds.at(-1)

    const indexed = lastRound.matches.map((match, i) => ({ match, scoreIdx: i }))
    const result = collectMatchOutcomes(indexed, lastRound.scores, session.teams)
    if (!result) {
        return null
    }

    const byeTeams = (lastRound.byes || []).map((id) => teamById(session.teams, id)).filter(Boolean)
    const advancing = [...result.winners, ...byeTeams]

    if (advancing.length <= 1) {
        if (advancing.length === 1) {
            session.bracket.champion = advancing[0].id
        }
        return null
    }

    markEliminated(
        session.bracket,
        result.losers.map((t) => t.id),
    )

    const { matches, byes } = buildPairedMatches(advancing, null)

    const roundNum = session.rounds.length + 1
    const label = matches.length === 1 && byes.length === 0 ? "Final" : `Round ${roundNum}`

    return {
        matches,
        byes,
        sitOuts: [],
        scores: null,
        tournamentRoundLabel: label,
    }
}

// ── Consolation Bracket ─────────────────────────────────────────

function separatePoolMatches(lastRound) {
    const winnersMatches = []
    const losersMatches = []
    for (let i = 0; i < lastRound.matches.length; i += 1) {
        const pool = lastRound.matches[i].bracketPool || "winners"
        const entry = { match: lastRound.matches[i], scoreIdx: i }
        if (pool === "losers") {
            losersMatches.push(entry)
        } else {
            winnersMatches.push(entry)
        }
    }
    return { winnersMatches, losersMatches }
}

function resolveLosersBracket(losersMatches, lastRound, session) {
    let losersAdvancing = []
    let losersBracketLosers = []
    if (losersMatches.length > 0) {
        const losersResult = collectMatchOutcomes(losersMatches, lastRound.scores, session.teams)
        if (!losersResult) {
            return null
        }
        losersAdvancing = losersResult.winners
        losersBracketLosers = losersResult.losers
    }

    const losersByes = (lastRound.losersByes || []).map((id) => teamById(session.teams, id)).filter(Boolean)
    losersAdvancing.push(...losersByes)

    return { losersAdvancing, losersBracketLosers }
}

function resolveWinnersBracket(winnersMatches, lastRound, session) {
    const winnersResult = collectMatchOutcomes(winnersMatches, lastRound.scores, session.teams)
    if (!winnersResult) {
        return null
    }

    const byeTeams = (lastRound.byes || []).map((id) => teamById(session.teams, id)).filter(Boolean)
    const winnersAdvancing = [...winnersResult.winners, ...byeTeams]
    return { winnersResult, winnersAdvancing }
}

function finalizeConsolationOnWinnersChampion(session, winnersAdvancing, losersPool) {
    if (winnersAdvancing.length !== 1) {
        return false
    }
    session.bracket.champion = winnersAdvancing[0].id
    markEliminated(
        session.bracket,
        losersPool.map((t) => t.id),
    )
    return true
}

function buildConsolationRoundMatches(winnersAdvancing, losersPool) {
    const winnersHalf = buildPairedMatches(winnersAdvancing, "winners")
    const losersHalf = buildPairedMatches(losersPool, "losers")
    const matches = [...winnersHalf.matches, ...losersHalf.matches]

    for (let i = 0; i < matches.length; i += 1) {
        matches[i].court = i + 1
    }

    return { winnersHalf, losersHalf, matches }
}

function resolveConsolationTerminalRoundDisplay(session, winnersAdvancing, losersHalf) {
    const isWinnersFinal = winnersAdvancing.length <= 2 && winnersAdvancing.length > 0
    if (!isWinnersFinal) {
        return {
            losersByes: losersHalf.byes,
            sitOuts: [],
        }
    }

    const sitOuts = losersHalf.byes.map((id) => teamById(session.teams, id)?.name || null).filter(Boolean)

    return {
        losersByes: [],
        sitOuts,
    }
}

function buildConsolationNextRound({ session, winnersAdvancing, losersPool, winnersHalf, losersHalf, matches }) {
    const roundNum = session.rounds.length + 1
    const { losersByes, sitOuts } = resolveConsolationTerminalRoundDisplay(session, winnersAdvancing, losersHalf)
    const isWinnersFinal = winnersAdvancing.length <= 2 && winnersAdvancing.length > 0
    const label = isWinnersFinal && losersPool.length <= 2 ? `Finals (Round ${roundNum})` : `Round ${roundNum}`

    return {
        matches,
        byes: winnersHalf.byes,
        losersByes,
        sitOuts,
        scores: null,
        tournamentRoundLabel: label,
    }
}

function advanceConsolation(session) {
    const lastRound = session.rounds.at(-1)
    const { winnersMatches, losersMatches } = separatePoolMatches(lastRound)

    const winnersInfo = resolveWinnersBracket(winnersMatches, lastRound, session)
    if (!winnersInfo) {
        return null
    }
    const { winnersResult, winnersAdvancing } = winnersInfo

    const losersInfo = resolveLosersBracket(losersMatches, lastRound, session)
    if (!losersInfo) {
        return null
    }

    const losersPool = [...winnersResult.losers, ...losersInfo.losersAdvancing]
    const { winnersHalf, losersHalf, matches } = buildConsolationRoundMatches(winnersAdvancing, losersPool)

    markEliminated(
        session.bracket,
        losersInfo.losersBracketLosers.map((t) => t.id),
    )

    // Once the winners bracket has produced a champion, the consolation event ends.
    // Do not schedule an extra placement match between the winners-final loser and losers-pool winner.
    if (finalizeConsolationOnWinnersChampion(session, winnersAdvancing, losersPool)) {
        return null
    }

    if (matches.length === 0) {
        if (winnersAdvancing.length === 1) {
            session.bracket.champion = winnersAdvancing[0].id
        }
        return null
    }

    // If this round contains the winners final, the tournament ends once that match is decided.
    // Keep playable losers matches, but convert terminal losers-side "bye" entries into sit-outs.
    return buildConsolationNextRound({
        session,
        winnersAdvancing,
        losersPool,
        winnersHalf,
        losersHalf,
        matches,
    })
}

// ── Format dispatch ─────────────────────────────────────────────

/**
 * Advance a tournament by one round based on the format.
 * Returns the next round or null if tournament is complete.
 */
function advanceTournament(session) {
    if (session.tournamentFormat === "elimination") {
        return advanceElimination(session)
    }
    if (session.tournamentFormat === "consolation") {
        return advanceConsolation(session)
    }
    return null
}

export { advanceElimination, advanceConsolation, advanceTournament }
