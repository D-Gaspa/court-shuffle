import { getCurrentSessionPhase } from "../../../domains/tournament/series/sync.js"
import {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    normalizeAdvancedForConfig,
} from "../../../domains/tournament/setup/advanced/model/index.js"
import { buildRestrictedTeamsFromSessionPhases } from "../../../domains/tournament/setup/advanced/model/restriction-collection.js"
import { canContinueTournamentSession, getLatestCompletedTournamentIndex } from "./eligibility.js"

function buildContinuationNotice(skippedPlayers) {
    const baseMessage =
        "Continuation setup loaded from the latest completed mini tournament; future unplayed mini tournaments in this phase will be abandoned on confirm"
    if (skippedPlayers <= 0) {
        return baseMessage
    }

    const noun = skippedPlayers === 1 ? "player was" : "players were"
    return `${baseMessage}; ${skippedPlayers} ${noun} skipped because they are no longer in the roster`
}

function countMissingPlayers(players, rosterSet) {
    let missing = 0
    for (const player of players) {
        if (!rosterSet.has(player)) {
            missing += 1
        }
    }
    return missing
}

function buildContinuationAdvancedConfig({ session, selectedPlayers, tournamentConfig }) {
    const advanced = cloneAdvancedSettings(tournamentConfig.advanced || getDefaultAdvancedSettings())
    if (tournamentConfig.teamSize === 2) {
        advanced.doublesRestrictedTeams =
            buildRestrictedTeamsFromSessionPhases({
                session,
                activePlayers: selectedPlayers,
                allowNotStrictDoubles: tournamentConfig.allowNotStrictDoubles,
                lockedPairs: advanced.doublesLockedPairs,
            }) || []
    }

    return normalizeAdvancedForConfig(advanced, tournamentConfig.allowNotStrictDoubles)
}

function buildContinuationPrefill(session, roster) {
    if (!canContinueTournamentSession(session)) {
        return null
    }

    const phase = getCurrentSessionPhase(session)
    if (!phase) {
        return null
    }

    const rosterSet = new Set(roster || [])
    const selectedPlayers = (phase.players || []).filter((player) => rosterSet.has(player))
    const skippedPlayers = countMissingPlayers(phase.players || [], rosterSet)
    const tournamentConfig = {
        ...phase.tournamentConfig,
        advanced: buildContinuationAdvancedConfig({
            session,
            selectedPlayers,
            tournamentConfig: phase.tournamentConfig,
        }),
    }

    return {
        currentStep: "roster",
        selectedPlayers,
        notice: buildContinuationNotice(skippedPlayers),
        gameMode: "tournament",
        tournament: {
            format: tournamentConfig.format,
            teamSize: tournamentConfig.teamSize,
            courtCount: tournamentConfig.courtCount,
            allowNotStrictDoubles: Boolean(tournamentConfig.allowNotStrictDoubles && tournamentConfig.teamSize === 2),
            advanced: cloneAdvancedSettings(tournamentConfig.advanced),
            seedOverride: null,
            seedOverrideSignature: "",
        },
        continuation: {
            sourcePhaseIndex: session.currentPhaseIndex,
            sourceTournamentIndex: getLatestCompletedTournamentIndex(phase),
            basePlayers: [...(phase.players || [])],
            baseCourtCount: phase.courtCount || tournamentConfig.courtCount || 1,
            baseAllowNotStrictDoubles: Boolean(tournamentConfig.allowNotStrictDoubles),
            abandonedTournamentCount: Math.max(
                0,
                (phase.tournamentSeries?.tournaments?.length || 0) - getLatestCompletedTournamentIndex(phase) - 1,
            ),
            lockedFields: {
                format: true,
                teamSize: true,
            },
        },
    }
}

export { buildContinuationPrefill }
