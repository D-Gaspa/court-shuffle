import { clonePlayerNameArray, expectSessionDateString } from "./player.js"
import { createValidationError, expectBoolean, expectInteger, expectPlainObject, expectString } from "./shared.js"

function expectNullableInteger(value, path) {
    if (value === null || value === undefined) {
        return null
    }
    return expectInteger(value, path)
}

function expectFiniteNumber(value, path) {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
        throw createValidationError(path, "must be a finite number.")
    }
    return value
}

function cloneTeamRatingImpact(value, path) {
    if (!value) {
        return null
    }
    const row = expectPlainObject(value, path)
    return {
        players: clonePlayerNameArray(row.players ?? [], `${path}.players`),
        ratingDelta: expectFiniteNumber(row.ratingDelta ?? 0, `${path}.ratingDelta`),
        won: expectBoolean(row.won ?? false, `${path}.won`),
        text: expectString(row.text ?? "", `${path}.text`),
    }
}

function cloneSummaryTeam(value, path) {
    const row = expectPlainObject(value, path)
    return {
        label: expectString(row.label ?? "", `${path}.label`),
        players: clonePlayerNameArray(row.players ?? [], `${path}.players`),
        won: expectBoolean(row.won ?? false, `${path}.won`),
        ratingImpact: cloneTeamRatingImpact(row.ratingImpact, `${path}.ratingImpact`),
    }
}

function cloneSummaryMatch(value, path) {
    const row = expectPlainObject(value, path)
    return {
        courtLabel: expectString(row.courtLabel ?? "", `${path}.courtLabel`),
        pool: expectString(row.pool ?? "", `${path}.pool`),
        score: expectString(row.score ?? "", `${path}.score`),
        winnerLabel: expectString(row.winnerLabel ?? "", `${path}.winnerLabel`),
        teams: (row.teams ?? []).map((team, index) => cloneSummaryTeam(team, `${path}.teams[${index}]`)),
    }
}

function cloneSummaryRound(value, path) {
    const row = expectPlainObject(value, path)
    return {
        label: expectString(row.label ?? "", `${path}.label`),
        matches: (row.matches ?? []).map((match, index) => cloneSummaryMatch(match, `${path}.matches[${index}]`)),
    }
}

function cloneSummaryTournament(value, path) {
    const row = expectPlainObject(value, path)
    return {
        label: expectString(row.label ?? "", `${path}.label`),
        winner: expectString(row.winner ?? "", `${path}.winner`),
        rounds: (row.rounds ?? []).map((round, index) => cloneSummaryRound(round, `${path}.rounds[${index}]`)),
    }
}

function cloneSessionSummaryTournamentRecap(value, path) {
    if (!Array.isArray(value ?? [])) {
        throw createValidationError(path, "must be an array.")
    }
    return (value ?? []).map((phase, index) => {
        const row = expectPlainObject(phase, `${path}[${index}]`)
        return {
            label: expectString(row.label ?? "", `${path}[${index}].label`),
            players: clonePlayerNameArray(row.players ?? [], `${path}[${index}].players`),
            tournaments: (row.tournaments ?? []).map((tournament, tournamentIndex) =>
                cloneSummaryTournament(tournament, `${path}[${index}].tournaments[${tournamentIndex}]`),
            ),
        }
    })
}

function cloneSessionSummary(value, path) {
    const source = expectPlainObject(value, path)
    const matchSummary = expectPlainObject(source.matchSummary ?? {}, `${path}.matchSummary`)
    if (!Array.isArray(source.miniTournamentWinners ?? [])) {
        throw createValidationError(`${path}.miniTournamentWinners`, "must be an array.")
    }
    if (!Array.isArray(source.notableResults ?? [])) {
        throw createValidationError(`${path}.notableResults`, "must be an array.")
    }
    if (!Array.isArray(source.leaderboard ?? [])) {
        throw createValidationError(`${path}.leaderboard`, "must be an array.")
    }
    return {
        createdAt: expectSessionDateString(source.createdAt, `${path}.createdAt`),
        leaderboardMode: expectString(source.leaderboardMode, `${path}.leaderboardMode`),
        sessionId: expectString(source.sessionId, `${path}.sessionId`),
        title: expectString(source.title, `${path}.title`),
        date: expectSessionDateString(source.date, `${path}.date`),
        players: clonePlayerNameArray(source.players ?? [], `${path}.players`),
        matchSummary: {
            played: expectInteger(matchSummary.played ?? 0, `${path}.matchSummary.played`),
            decided: expectInteger(matchSummary.decided ?? 0, `${path}.matchSummary.decided`),
        },
        miniTournamentWinners: (source.miniTournamentWinners ?? []).map((item, index) => {
            const row = expectPlainObject(item, `${path}.miniTournamentWinners[${index}]`)
            return {
                label: expectString(row.label, `${path}.miniTournamentWinners[${index}].label`),
                winner: expectString(row.winner, `${path}.miniTournamentWinners[${index}].winner`),
            }
        }),
        notableResults: (source.notableResults ?? []).map((item, index) => {
            const row = expectPlainObject(item, `${path}.notableResults[${index}]`)
            return {
                label: expectString(row.label, `${path}.notableResults[${index}].label`),
                value: expectString(row.value, `${path}.notableResults[${index}].value`),
            }
        }),
        leaderboard: (source.leaderboard ?? []).map((item, index) => {
            const row = expectPlainObject(item, `${path}.leaderboard[${index}]`)
            return {
                name: expectString(row.name, `${path}.leaderboard[${index}].name`),
                beforeRank: expectNullableInteger(row.beforeRank, `${path}.leaderboard[${index}].beforeRank`),
                afterRank: expectNullableInteger(row.afterRank, `${path}.leaderboard[${index}].afterRank`),
                rankDelta: expectFiniteNumber(row.rankDelta ?? 0, `${path}.leaderboard[${index}].rankDelta`),
                beforeRating: expectNullableInteger(row.beforeRating, `${path}.leaderboard[${index}].beforeRating`),
                afterRating: expectNullableInteger(row.afterRating, `${path}.leaderboard[${index}].afterRating`),
                ratingDelta: expectFiniteNumber(row.ratingDelta ?? 0, `${path}.leaderboard[${index}].ratingDelta`),
                wins: expectInteger(row.wins ?? 0, `${path}.leaderboard[${index}].wins`),
                losses: expectInteger(row.losses ?? 0, `${path}.leaderboard[${index}].losses`),
                winRate: expectString(row.winRate ?? "—", `${path}.leaderboard[${index}].winRate`),
                games: expectInteger(row.games ?? 0, `${path}.leaderboard[${index}].games`),
            }
        }),
        tournamentRecap: cloneSessionSummaryTournamentRecap(source.tournamentRecap ?? [], `${path}.tournamentRecap`),
    }
}

export { cloneSessionSummary }
