import { getAvatarClass, getInitials } from "../../roster/render.js"
import { appendMatchResult, applyMatchWinnerUi } from "./match-result-render.js"

const TEAM_COLOR_COUNT = 8
const CARD_STAGGER_SECONDS = 0.06
const AVATAR_OFFSET_MULTIPLIER = 3

function buildPlayerDot(cssClass) {
    const dot = document.createElement("span")
    dot.className = `dot ${cssClass}`
    return dot
}

function buildMatchTeamSide(team, label, teamClass) {
    const wrapper = document.createElement("div")
    wrapper.className = `match-team ${teamClass}`

    const labelEl = document.createElement("div")
    labelEl.className = "match-team-label"
    labelEl.textContent = label

    const list = document.createElement("div")
    list.className = "match-team-players"

    for (const p of team) {
        const row = document.createElement("div")
        row.className = "match-player"
        row.appendChild(buildPlayerDot(""))

        const nameSpan = document.createElement("span")
        nameSpan.className = "match-player-name"
        nameSpan.textContent = p

        row.appendChild(nameSpan)
        list.appendChild(row)
    }

    wrapper.appendChild(labelEl)
    wrapper.appendChild(list)
    return wrapper
}

function buildVersusHeader(matchNum) {
    const header = document.createElement("div")
    header.className = "match-card-header"
    const headerSpan = document.createElement("span")
    headerSpan.textContent = `Court ${matchNum}`
    header.appendChild(headerSpan)
    return header
}

function renderVersusMatch(teams, matchNum, container, opts) {
    const card = document.createElement("div")
    card.className = "match-card"
    card.style.animationDelay = "0.05s"
    const versus = document.createElement("div")
    versus.className = "match-versus"

    const teamOneElement = buildMatchTeamSide(teams[0], "Team 1", "team-a")
    versus.appendChild(teamOneElement)

    const divider = document.createElement("div")
    divider.className = "match-vs-divider"
    const badge = document.createElement("div")
    badge.className = "vs-badge"
    badge.textContent = "VS"
    divider.appendChild(badge)
    versus.appendChild(divider)

    const teamTwoElement = buildMatchTeamSide(teams[1], "Team 2", "team-b")
    versus.appendChild(teamTwoElement)
    applyMatchWinnerUi(card, [teamOneElement, teamTwoElement], opts?.entry)
    card.appendChild(buildVersusHeader(matchNum))
    card.appendChild(versus)
    appendMatchResult(card, opts, [teamOneElement, teamTwoElement])
    container.appendChild(card)
}

function renderTeamCards(teams, container) {
    let i = 0
    while (i < teams.length) {
        const card = document.createElement("div")
        card.className = `team-card team-color-${i % TEAM_COLOR_COUNT}`
        card.style.animationDelay = `${i * CARD_STAGGER_SECONDS}s`

        const team = teams[i]

        const cardHeader = document.createElement("div")
        cardHeader.className = "team-card-header"

        const title = document.createElement("span")
        title.className = "team-card-title"
        title.textContent = `Team ${i + 1}`

        const count = document.createElement("span")
        count.className = "team-card-count"
        count.textContent = `${team.length} player${team.length !== 1 ? "s" : ""}`

        cardHeader.appendChild(title)
        cardHeader.appendChild(count)

        const playersList = document.createElement("div")
        playersList.className = "team-card-players"

        let pi = 0
        while (pi < team.length) {
            const avatarIdx = pi + i * AVATAR_OFFSET_MULTIPLIER
            const row = document.createElement("div")
            row.className = "team-card-player"

            const miniAvatar = document.createElement("div")
            miniAvatar.className = `mini-avatar ${getAvatarClass(avatarIdx)}`
            miniAvatar.textContent = getInitials(team[pi])

            const nameSpan = document.createElement("span")
            nameSpan.textContent = team[pi]

            row.appendChild(miniAvatar)
            row.appendChild(nameSpan)
            playersList.appendChild(row)
            pi += 1
        }

        card.appendChild(cardHeader)
        card.appendChild(playersList)
        container.appendChild(card)
        i += 1
    }
}

function buildMatchOpts(bracketOpts, matchIndex, scoreEntry, teamLabels) {
    if (bracketOpts.editable && bracketOpts.onCommit) {
        return {
            editable: true,
            entry: scoreEntry,
            onCommit: (val, options) => bracketOpts.onCommit(matchIndex, val, options),
            onEditingChange: (isEditing) => bracketOpts.onEditingChange?.(matchIndex, isEditing),
            isEditing: Boolean(bracketOpts.isEditing?.(matchIndex)),
            teamLabels,
        }
    }
    if (scoreEntry) {
        return { entry: scoreEntry, teamLabels }
    }
    return null
}

function resolveTeamLabels(match, opts) {
    if (match.teams.length !== 2) {
        return
    }
    if (opts?.teamNames) {
        return [opts.teamNames(match.teams[0]), opts.teamNames(match.teams[1])]
    }
    return ["Team 1", "Team 2"]
}

function renderMatchList(round, container, opts) {
    for (let i = 0; i < round.matches.length; i += 1) {
        const match = round.matches[i]
        const scoreEntry = round.scores ? round.scores[i] : null
        const teamLabels = resolveTeamLabels(match, opts)
        const matchOpts = opts ? buildMatchOpts(opts, i, scoreEntry, teamLabels) : null
        if (match.teams.length === 2) {
            renderVersusMatch(match.teams, match.court, container, matchOpts)
        } else {
            renderTeamCards(match.teams, container)
        }
    }
}

export function renderBracket(round, container, opts) {
    container.textContent = ""

    if (round.matches) {
        renderMatchList(round, container, opts)
        return
    }

    if (round.length === 2) {
        renderVersusMatch(round, 1, container, null)
    } else {
        renderTeamCards(round, container)
    }
}

export function renderSitOuts(sitOuts, container) {
    container.textContent = ""
    for (const player of sitOuts) {
        const chip = document.createElement("div")
        chip.className = "sit-out-chip"

        const avatar = document.createElement("div")
        avatar.className = `mini-avatar ${getAvatarClass(0)}`
        avatar.textContent = getInitials(player)

        const name = document.createElement("span")
        name.textContent = player

        chip.appendChild(avatar)
        chip.appendChild(name)
        container.appendChild(chip)
    }
}

export function updateTeamSizeHint(selectedCount, teamCount, hintEl) {
    if (selectedCount < 2) {
        hintEl.textContent = ""
        return
    }
    const base = Math.floor(selectedCount / teamCount)
    const remainder = selectedCount % teamCount
    if (remainder === 0) {
        hintEl.textContent = `${base} players per team`
    } else {
        const bigger = remainder
        const smaller = teamCount - remainder
        hintEl.textContent = `${bigger} team${bigger > 1 ? "s" : ""} of ${base + 1}, ${smaller} team${smaller > 1 ? "s" : ""} of ${base}`
    }
}

export function renderPlayerSelection(roster, selectedSet, container, onChange) {
    container.textContent = ""

    for (const player of roster) {
        const chip = document.createElement("button")
        chip.type = "button"
        chip.className = `player-chip${selectedSet.has(player) ? " selected" : ""}`

        const check = document.createElement("span")
        check.className = "chip-check"
        check.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'

        const nameSpan = document.createElement("span")
        nameSpan.className = "chip-name"
        nameSpan.textContent = player

        chip.appendChild(check)
        chip.appendChild(nameSpan)

        chip.addEventListener("click", () => {
            if (selectedSet.has(player)) {
                selectedSet.delete(player)
            } else {
                selectedSet.add(player)
            }
            chip.classList.toggle("selected")
            onChange()
        })
        container.appendChild(chip)
    }
}
