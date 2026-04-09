// biome-ignore-all lint/nursery/useExpect: node:test uses assert-based checks here.
// biome-ignore-all lint/style/noMagicNumbers: compact fixture ids keep the test readable.
import assert from "node:assert/strict"
import test from "node:test"

import { buildHistoryCardMeta, resolveSessionChampionName } from "../js/history/render-header.js"

const CHAMPION_LABEL_PATTERN = /Champion: Cora & Dana/

function createSeriesSession() {
    return {
        mode: "tournament",
        players: ["Ana", "Bea", "Cora", "Dana"],
        rounds: [],
        tournamentSeries: {
            matchType: "doubles",
            format: "consolation",
            tournaments: [
                {
                    rounds: [
                        {
                            matches: [],
                            scores: null,
                            sitOuts: [],
                            byes: [],
                            losersByes: [],
                        },
                    ],
                    teams: [
                        { id: 1, name: "Ana & Bea", players: ["Ana", "Bea"] },
                        { id: 2, name: "Cora & Dana", players: ["Cora", "Dana"] },
                    ],
                    bracket: {
                        champion: 2,
                    },
                },
            ],
        },
    }
}

test("series sessions derive the champion from saved tournament runs", () => {
    const session = createSeriesSession()

    assert.equal(resolveSessionChampionName(session), "Cora & Dana")
    assert.match(buildHistoryCardMeta(session), CHAMPION_LABEL_PATTERN)
})
