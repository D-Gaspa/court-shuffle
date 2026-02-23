/**
 * Manual pairing and seeding UI for tournament setup.
 */

const manualPairingGrid = document.getElementById("manual-pairing-grid")
const manualSeedingList = document.getElementById("manual-seeding-list")

let manualPairings = []
let manualSeedOrder = []

/**
 * Render the manual pairing UI for doubles tournament.
 * Players are shown in a list and paired sequentially.
 */
function renderManualPairing(players) {
    manualPairingGrid.textContent = ""
    manualPairings = []

    for (let i = 0; i < players.length; i += 2) {
        const pair = [players[i]]
        if (i + 1 < players.length) {
            pair.push(players[i + 1])
        }
        manualPairings.push(pair)

        const pairEl = document.createElement("div")
        pairEl.className = "manual-pair"

        const label = document.createElement("span")
        label.className = "pair-label"
        label.textContent = `Team ${manualPairings.length}`

        const names = document.createElement("span")
        names.className = "pair-names"
        names.textContent = pair.join(" & ")

        pairEl.appendChild(label)
        pairEl.appendChild(names)
        manualPairingGrid.appendChild(pairEl)
    }
}

/**
 * Render the manual seeding list.
 * Shows teams/players in bracket order with drag-to-reorder.
 */
function renderManualSeeding(players) {
    manualSeedingList.textContent = ""
    manualSeedOrder = [...players]

    for (let i = 0; i < manualSeedOrder.length; i += 1) {
        const item = document.createElement("div")
        item.className = "seeding-item"
        item.draggable = true
        item.dataset.index = i

        const seed = document.createElement("span")
        seed.className = "seed-number"
        seed.textContent = `#${i + 1}`

        const name = document.createElement("span")
        name.className = "seed-name"
        name.textContent = manualSeedOrder[i]

        const grip = document.createElement("span")
        grip.className = "seed-grip"
        grip.innerHTML = "&#x2630;"

        item.appendChild(seed)
        item.appendChild(name)
        item.appendChild(grip)
        manualSeedingList.appendChild(item)

        item.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", i.toString())
            item.classList.add("dragging")
        })
        item.addEventListener("dragend", () => {
            item.classList.remove("dragging")
        })
        item.addEventListener("dragover", (e) => {
            e.preventDefault()
            item.classList.add("drag-over")
        })
        item.addEventListener("dragleave", () => {
            item.classList.remove("drag-over")
        })
        item.addEventListener("drop", (e) => {
            e.preventDefault()
            item.classList.remove("drag-over")
            const fromIdx = Number(e.dataTransfer.getData("text/plain"))
            const toIdx = Number(item.dataset.index)
            if (fromIdx !== toIdx) {
                const [moved] = manualSeedOrder.splice(fromIdx, 1)
                manualSeedOrder.splice(toIdx, 0, moved)
                renderManualSeeding(manualSeedOrder)
            }
        })
    }
}

function getManualPairings() {
    return manualPairings
}

function getManualSeedOrder() {
    return manualSeedOrder
}

export { renderManualPairing, renderManualSeeding, getManualPairings, getManualSeedOrder }
