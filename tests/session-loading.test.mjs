// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
import assert from "node:assert/strict"
import test from "node:test"

import { hideSessionLoading, showSessionLoading } from "../js/session/controller/loading.js"

test("showSessionLoading reveals overlay and marks body busy", () => {
    const overlay = { hidden: true }
    const message = { textContent: "" }
    const classNames = new Set()
    const originalDocument = globalThis.document

    globalThis.document = {
        body: {
            classList: {
                add: (name) => classNames.add(name),
                remove: (name) => classNames.delete(name),
            },
        },
    }

    showSessionLoading({
        overlay,
        message,
        text: "Working...",
    })

    assert.equal(overlay.hidden, false)
    assert.equal(message.textContent, "Working...")
    assert.equal(classNames.has("is-session-loading"), true)

    globalThis.document = originalDocument
})

test("hideSessionLoading hides overlay and clears body busy", () => {
    const overlay = { hidden: false }
    const classNames = new Set(["is-session-loading"])
    const originalDocument = globalThis.document

    globalThis.document = {
        body: {
            classList: {
                add: (name) => classNames.add(name),
                remove: (name) => classNames.delete(name),
            },
        },
    }

    hideSessionLoading(overlay)

    assert.equal(overlay.hidden, true)
    assert.equal(classNames.has("is-session-loading"), false)

    globalThis.document = originalDocument
})
