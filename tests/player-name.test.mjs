// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
import assert from "node:assert/strict"
import test from "node:test"

import { validateRosterPlayerName } from "../js/roster/player-name.js"

test("roster player names reject reserved delimiters", () => {
    assert.equal(validateRosterPlayerName("Ana||Bea"), 'Player names cannot contain "||" or ",".')
    assert.equal(validateRosterPlayerName("Ana, Bea"), 'Player names cannot contain "||" or ",".')
})

test("roster player names allow ordinary names", () => {
    assert.equal(validateRosterPlayerName("Ana"), "")
    assert.equal(validateRosterPlayerName("Ana Bea"), "")
})
