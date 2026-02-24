import { normalizeSets } from "../score-editor/sets.js"
import { determineMatchWinner } from "../tournament/utils.js"

function createPlayerSummary() {
    return {
        playedMatches: 0,
        decidedMatches: 0,
        wins: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        totalGameDiff: 0,
    }
}

function createRelationStats() {
    return {
        matches: 0,
        wins: 0,
        losses: 0,
        totalGameDiff: 0,
    }
}

function createAccumulator() {
    return {
        playedMatchCount: 0,
        decidedMatchCount: 0,
        playerSummaries: new Map(),
        partnerMatrix: new Map(),
        opponentMatrix: new Map(),
        partnerRelations: new Map(),
        opponentRelations: new Map(),
    }
}

function ensureNestedMap(root, key) {
    if (!root.has(key)) {
        root.set(key, new Map())
    }
    return root.get(key)
}

function ensurePlayerSummary(map, name) {
    if (!map.has(name)) {
        map.set(name, createPlayerSummary())
    }
    return map.get(name)
}

function ensureRelation(map, playerName, otherName) {
    const playerMap = ensureNestedMap(map, playerName)
    if (!playerMap.has(otherName)) {
        playerMap.set(otherName, createRelationStats())
    }
    return playerMap.get(otherName)
}

function incrementPairCount(matrix, a, b) {
    if (!(a && b) || a === b) {
        return
    }
    const rowA = ensureNestedMap(matrix, a)
    const rowB = ensureNestedMap(matrix, b)
    rowA.set(b, (rowA.get(b) || 0) + 1)
    rowB.set(a, (rowB.get(a) || 0) + 1)
}

function isCompleteSet(setScore) {
    return Array.isArray(setScore) && Number.isFinite(setScore[0]) && Number.isFinite(setScore[1])
}

function getCompleteSets(scoreEntry) {
    const sets = normalizeSets(scoreEntry)
    if (!Array.isArray(sets)) {
        return []
    }
    return sets.filter(isCompleteSet)
}

function getRoundGroups(session) {
    const runs = session.tournamentSeries?.tournaments
    if (!Array.isArray(runs)) {
        return [session]
    }
    return runs.filter((run) => Array.isArray(run.rounds) && run.rounds.length > 0)
}

function getScoredMatch(round, matchIndex) {
    const entry = round.scores?.[matchIndex]
    if (!entry) {
        return null
    }
    const completeSets = getCompleteSets(entry)
    if (completeSets.length === 0) {
        return null
    }
    return {
        completeSets,
        winnerIdx: determineMatchWinner({ ...entry, sets: completeSets }),
    }
}

function sumGamesForTeam(sets, teamIdx) {
    let total = 0
    for (const [gamesA, gamesB] of sets) {
        total += teamIdx === 0 ? gamesA : gamesB
    }
    return total
}

function accumulateHistoryStats(history) {
    const sessions = Array.isArray(history) ? history : []
    const acc = createAccumulator()
    for (const session of sessions) {
        processHistorySession(session, acc)
    }
    return { sessions, acc }
}

function processHistorySession(session, acc) {
    for (const group of getRoundGroups(session)) {
        processRoundList(group.rounds, acc)
    }
}

function processRoundList(rounds, acc) {
    if (!Array.isArray(rounds)) {
        return
    }
    for (const round of rounds) {
        processRound(round, acc)
    }
}

function processRound(round, acc) {
    if (!Array.isArray(round?.matches) || round.matches.length === 0) {
        return
    }
    for (let index = 0; index < round.matches.length; index += 1) {
        processRoundMatch(round, round.matches[index], index, acc)
    }
}

function processRoundMatch(round, match, matchIndex, acc) {
    if (!Array.isArray(match?.teams) || match.teams.length !== 2) {
        return
    }
    const scored = getScoredMatch(round, matchIndex)
    if (!scored) {
        return
    }
    const teams = sanitizeTeams(match.teams)
    if (!teams) {
        return
    }
    recordPlayedMatch(teams, acc)
    if (scored.winnerIdx === 0 || scored.winnerIdx === 1) {
        recordDecidedMatch(teams, scored, acc)
    }
}

function sanitizeTeams(rawTeams) {
    const teams = rawTeams.map((team) => (Array.isArray(team) ? team.filter(Boolean) : []))
    if (teams.some((team) => team.length === 0)) {
        return null
    }
    return teams
}

function recordPlayedMatch(teams, acc) {
    acc.playedMatchCount += 1
    for (const team of teams) {
        for (const player of team) {
            ensurePlayerSummary(acc.playerSummaries, player).playedMatches += 1
        }
        incrementPartnerHeatmap(team, acc.partnerMatrix)
    }
    incrementOpponentHeatmap(teams[0], teams[1], acc.opponentMatrix)
}

function incrementPartnerHeatmap(team, matrix) {
    for (let i = 0; i < team.length; i += 1) {
        for (let j = i + 1; j < team.length; j += 1) {
            incrementPairCount(matrix, team[i], team[j])
        }
    }
}

function incrementOpponentHeatmap(teamA, teamB, matrix) {
    for (const playerA of teamA) {
        for (const playerB of teamB) {
            incrementPairCount(matrix, playerA, playerB)
        }
    }
}

function recordDecidedMatch(teams, scored, acc) {
    acc.decidedMatchCount += 1
    const games = [sumGamesForTeam(scored.completeSets, 0), sumGamesForTeam(scored.completeSets, 1)]
    for (let teamIdx = 0; teamIdx < teams.length; teamIdx += 1) {
        const teamContext = { teamIdx, winnerIdx: scored.winnerIdx, games, acc }
        recordTeamPlayerOutcomes(teams[teamIdx], teamContext)
        recordPartnerRelations(teams[teamIdx], teamContext)
    }
    recordOpponentRelations(teams, scored.winnerIdx, games, acc)
}

function recordTeamPlayerOutcomes(team, context) {
    const { teamIdx, winnerIdx, games, acc } = context
    const didWin = teamIdx === winnerIdx
    const ownGames = games[teamIdx]
    const oppGames = games[teamIdx === 0 ? 1 : 0]
    const diff = ownGames - oppGames
    for (const player of team) {
        const summary = ensurePlayerSummary(acc.playerSummaries, player)
        summary.decidedMatches += 1
        summary.gamesFor += ownGames
        summary.gamesAgainst += oppGames
        summary.totalGameDiff += diff
        if (didWin) {
            summary.wins += 1
        } else {
            summary.losses += 1
        }
    }
}

function recordPartnerRelations(team, context) {
    if (team.length < 2) {
        return
    }
    const { teamIdx, winnerIdx, games, acc } = context
    const diff = games[teamIdx] - games[teamIdx === 0 ? 1 : 0]
    const didWin = teamIdx === winnerIdx
    const outcome = { didWin, diff }
    for (let i = 0; i < team.length; i += 1) {
        for (let j = i + 1; j < team.length; j += 1) {
            updateMirroredRelation(acc.partnerRelations, team[i], team[j], outcome)
        }
    }
}

function updateMirroredRelation(map, playerA, playerB, outcome) {
    updateRelationStats(ensureRelation(map, playerA, playerB), outcome.didWin, outcome.diff)
    updateRelationStats(ensureRelation(map, playerB, playerA), outcome.didWin, outcome.diff)
}

function updateRelationStats(stats, didWin, diff) {
    stats.matches += 1
    stats.totalGameDiff += diff
    if (didWin) {
        stats.wins += 1
        return
    }
    stats.losses += 1
}

function recordOpponentRelations(teams, winnerIdx, games, acc) {
    const diffA = games[0] - games[1]
    for (const playerA of teams[0]) {
        for (const playerB of teams[1]) {
            updateRelationStats(ensureRelation(acc.opponentRelations, playerA, playerB), winnerIdx === 0, diffA)
            updateRelationStats(ensureRelation(acc.opponentRelations, playerB, playerA), winnerIdx === 1, -diffA)
        }
    }
}

export { accumulateHistoryStats }
