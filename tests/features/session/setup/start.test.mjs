import assert from "node:assert/strict"
import test from "node:test"

import { startSession } from "../../../../js/features/session/setup/state/actions.js"

function createDraft(overrides = {}) {
    return {
        currentStep: "setup",
        gameMode: "tournament",
        continuation: null,
        historySeed: null,
        free: {
            teamCount: 2,
        },
        structured: {
            courtCount: 1,
            allowNotStrictDoubles: false,
        },
        tournament: {
            courtCount: 3,
            allowNotStrictDoubles: true,
            buildConfig: {
                format: "elimination",
                teamSize: 2,
            },
        },
        ...overrides,
    }
}

test("startSession awaits async session building before continuing", async () => {
    const callOrder = []
    let onSessionStartArg = null

    await startSession({
        draft: createDraft(),
        buildSelectedSession: async () => {
            callOrder.push("build-start")
            await Promise.resolve()
            callOrder.push("build-end")
            return { id: "session-1" }
        },
        buildWizardState: () => ({
            finalStep: "setup",
            completed: {
                setup: true,
            },
        }),
        clearSetupNotice: () => {
            callOrder.push("clear")
        },
        getFinalStepId: () => "setup",
        getPlayers: () => ["Ana", "Bea", "Cora", "Dana"],
        getTournamentBlockingError: () => "",
        getVisibleStepIds: () => ["roster", "mode", "setup"],
        onSessionStart: (session) => {
            callOrder.push("started")
            onSessionStartArg = session
        },
    })

    assert.deepEqual(callOrder, ["build-start", "build-end", "clear", "started"])
    assert.deepEqual(onSessionStartArg, { id: "session-1" })
})
