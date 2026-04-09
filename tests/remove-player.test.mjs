// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
import assert from "node:assert/strict"
import test from "node:test"

import { buildPlayerRemovalPlan } from "../js/roster/remove-player.js"

test("active savable sessions offer save and discard removal options", () => {
    const plan = buildPlayerRemovalPlan(
        "Ana",
        {
            players: ["Ana", "Bea"],
        },
        true,
    )

    assert.deepEqual(plan, {
        includesActivePlayer: true,
        canSaveActiveSession: true,
        message:
            'Remove "Ana" from the roster?\nThis will also end the active session because its saved schedule can no longer be reconciled safely.',
        okLabel: "Save & Remove",
        okClass: "btn-primary",
        extraLabel: "Discard Session & Remove",
    })
})

test("active unsaved sessions only offer discard removal", () => {
    const plan = buildPlayerRemovalPlan(
        "Ana",
        {
            players: ["Ana", "Bea"],
        },
        false,
    )

    assert.deepEqual(plan, {
        includesActivePlayer: true,
        canSaveActiveSession: false,
        message:
            'Remove "Ana" from the roster?\nThis will also end the active session because its saved schedule can no longer be reconciled safely.',
        okLabel: "Discard Session & Remove",
        okClass: "btn-danger",
    })
})
