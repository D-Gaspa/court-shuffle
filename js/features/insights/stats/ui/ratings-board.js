import { getAvatarClass, getInitials } from "../../../roster/render.js"
import { createPanelHeader } from "./dom.js"
import { formatCountLabel, formatInteger, formatSignedNumber } from "./format.js"
import { createPlayerRatingPanel } from "./ratings-dossier.js"
import { getLiveRowState } from "./ratings-live.js"

const PERCENT_SCALE = 100

function createEl(tag, className, text) {
    const el = document.createElement(tag)
    if (className) {
        el.className = className
    }
    if (text !== undefined) {
        el.textContent = text
    }
    return el
}

function formatGamesPill(player) {
    const games = formatCountLabel(player.ratedMatchCount, "game")
    if (player.ratedMatchCount <= 0) {
        return games
    }
    const winRate = Math.round((player.wins / player.ratedMatchCount) * PERCENT_SCALE)
    return `${games} (${winRate}%)`
}

function createLeaderboardBody({ index, liveState, player, playerName }) {
    const body = createEl("div", "stats-ratings-row-body")
    body.appendChild(createEl("span", "player-name stats-ratings-player-name", playerName))
    const summary = createEl("div", "stats-ratings-row-summary")
    summary.appendChild(createEl("span", "stats-ratings-rank", `#${index + 1}`))
    const top = createEl("div", "stats-ratings-row-topline")
    top.appendChild(createEl("strong", "stats-ratings-rating-value", formatInteger(player.rating)))
    if (liveState.showRatingDelta) {
        top.appendChild(createRatingPill(formatSignedNumber(liveState.ratingDelta, 0), liveState.deltaTone))
    }
    summary.appendChild(top)
    body.appendChild(summary)

    const meta = createEl("div", "stats-player-row-meta stats-ratings-row-meta")
    meta.appendChild(createRatingPill(formatGamesPill(player), "matches"))
    if (liveState.rankLabel) {
        meta.appendChild(createRatingPill(liveState.rankLabel, liveState.rankTone))
    }
    body.appendChild(meta)
    return body
}

function createRatingPill(text, tone) {
    return createEl("span", `stats-player-row-pill stats-ratings-pill-${tone}`, text)
}

function createAvatar(playerName, index) {
    const avatar = createEl("div", `player-avatar ${getAvatarClass(index)}`)
    avatar.textContent = getInitials(playerName).toUpperCase()
    return avatar
}

function createLeaderboardRow({
    comparison,
    comparisonRank,
    index,
    isLiveParticipant,
    onSelectPlayer,
    player,
    playerName,
    selected,
    storyRow,
}) {
    const liveState = getLiveRowState({ comparison, comparisonRank, index, isLiveParticipant, player, storyRow })
    const stateClass = liveState.tone ? ` is-live-${liveState.tone}` : ""
    const button = createEl("button", `roster-item stats-player-row stats-ratings-row${stateClass}`)
    button.type = "button"
    const avatar = createAvatar(playerName, index)
    if (selected) {
        avatar.classList.add("is-selected")
    }
    button.appendChild(avatar)
    button.appendChild(createLeaderboardBody({ index, liveState, playerName, player }))
    button.addEventListener("click", () => onSelectPlayer(playerName))
    return button
}

function createLeaderboardGrid({
    comparisonLadder,
    ladder,
    latestStoryMap,
    liveParticipantSet,
    selectedPlayer,
    onSelectPlayer,
}) {
    const list = createEl("div", "stats-ratings-grid")
    for (let index = 0; index < ladder.leaderboard.length; index += 1) {
        const playerName = ladder.leaderboard[index]
        list.appendChild(
            createLeaderboardRow({
                index,
                playerName,
                comparison: comparisonLadder?.players?.[playerName] || null,
                comparisonRank: comparisonLadder ? comparisonLadder.leaderboard.indexOf(playerName) + 1 || null : null,
                player: ladder.players[playerName],
                storyRow: latestStoryMap.get(playerName) || null,
                selected: playerName === selectedPlayer,
                isLiveParticipant: liveParticipantSet.has(playerName),
                onSelectPlayer,
            }),
        )
    }
    return list
}

function createRatingsBoard({
    comparisonLadder,
    ladder,
    latestStoryMap,
    liveParticipantSet,
    selectedPlayer,
    onSelectPlayer,
}) {
    const section = createEl("section", "stats-panel stats-panel-ratings-board")
    section.appendChild(
        createPanelHeader("Leaderboard", "Rank movement tells the story; point swings stay in the pill details."),
    )
    section.appendChild(
        createLeaderboardGrid({
            comparisonLadder,
            ladder,
            latestStoryMap,
            liveParticipantSet,
            selectedPlayer,
            onSelectPlayer,
        }),
    )
    section.appendChild(createPlayerRatingPanel(comparisonLadder, ladder, selectedPlayer))
    return section
}

export { createRatingsBoard }
