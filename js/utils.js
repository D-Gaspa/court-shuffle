export function renameInRounds(rounds, oldName, newName) {
    for (const round of rounds) {
        for (const team of round) {
            const ti = team.indexOf(oldName)
            if (ti !== -1) {
                team[ti] = newName
            }
        }
    }
}

export function renameInPlayerList(players, oldName, newName) {
    const pi = players.indexOf(oldName)
    if (pi !== -1) {
        players[pi] = newName
    }
}

export function showFieldError(el, msg) {
    el.textContent = msg
    el.hidden = false
}

export function hideFieldError(el) {
    el.textContent = ""
    el.hidden = true
}
