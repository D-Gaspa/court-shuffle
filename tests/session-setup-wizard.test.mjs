// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
import assert from "node:assert/strict"
import test from "node:test"

function createDraft(overrides = {}) {
    return {
        selectedPlayers: new Set(["Ana", "Bea", "Cora", "Dana"]),
        gameMode: "tournament",
        continuation: null,
        free: {
            teamCount: 2,
        },
        structured: {
            courtCount: 1,
            allowNotStrictDoubles: false,
        },
        tournament: {
            format: "elimination",
            teamSize: 2,
            courtCount: 1,
            allowNotStrictDoubles: false,
            preview: { ok: true },
        },
        ...overrides,
    }
}

async function loadWizardModules() {
    globalThis.document = {
        getElementById: () => null,
    }

    const draftModule = await import("../js/session/controller/setup/draft.js")
    const stateModule = await import("../js/session/controller/wizard/state.js")
    return {
        getVisibleStepIds: draftModule.getVisibleStepIds,
        buildWizardState: stateModule.buildWizardState,
    }
}

test("getVisibleStepIds removes the mode step for continuation", async () => {
    const { getVisibleStepIds } = await loadWizardModules()
    assert.deepEqual(getVisibleStepIds(createDraft()), ["roster", "mode", "setup"])
    assert.deepEqual(
        getVisibleStepIds(createDraft({ continuation: { lockedFields: { format: true, teamSize: true } } })),
        ["roster", "setup"],
    )
})

test("buildWizardState unlocks setup directly after roster during continuation", async () => {
    const { getVisibleStepIds, buildWizardState } = await loadWizardModules()
    const draft = createDraft({
        selectedPlayers: new Set(["Ana", "Bea", "Cora", "Eva"]),
        continuation: {
            basePlayers: ["Ana", "Bea", "Cora", "Dana"],
            lockedFields: {
                format: true,
                teamSize: true,
            },
        },
    })

    const wizardState = buildWizardState(
        draft,
        () => "",
        () => "setup",
        getVisibleStepIds,
    )

    assert.deepEqual(wizardState.visibleSteps, ["roster", "setup"])
    assert.equal(wizardState.completed.roster, true)
    assert.equal(wizardState.completed.mode, true)
    assert.equal(wizardState.unlockedIndex, 1)
    assert.equal(wizardState.finalStep, "setup")
})

test("buildWizardState blocks continuation when the roster is unchanged", async () => {
    const { getVisibleStepIds, buildWizardState } = await loadWizardModules()
    const draft = createDraft({
        continuation: {
            basePlayers: ["Ana", "Bea", "Cora", "Dana"],
            lockedFields: {
                format: true,
                teamSize: true,
            },
        },
    })

    const wizardState = buildWizardState(
        draft,
        () => "",
        () => "setup",
        getVisibleStepIds,
    )

    assert.equal(wizardState.completed.roster, false)
    assert.equal(wizardState.completed.setup, false)
    assert.equal(wizardState.unlockedIndex, 0)
})
