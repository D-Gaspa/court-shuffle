/**
 * Deterministic pseudo-random helpers for reproducible scheduling.
 */

const HASH_MULTIPLIER = 31
const LCG_MULTIPLIER = 48_271
const LCG_MODULUS = 2_147_483_647

function hashSeed(input) {
    let h = 1
    const str = String(input)
    for (let i = 0; i < str.length; i += 1) {
        h = (h * HASH_MULTIPLIER + str.charCodeAt(i)) % LCG_MODULUS
    }
    return h === 0 ? 1 : h
}

/**
 * Park-Miller LCG (minimal standard), returns a Math.random-compatible function.
 */
function createSeededRng(seed) {
    let t = hashSeed(seed)
    return () => {
        t = (t * LCG_MULTIPLIER) % LCG_MODULUS
        return t / LCG_MODULUS
    }
}

function randomInt(rng, maxExclusive) {
    return Math.floor(rng() * maxExclusive)
}

function shuffleWithRng(arr, rng) {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = randomInt(rng, i + 1)
        const tmp = copy[i]
        copy[i] = copy[j]
        copy[j] = tmp
    }
    return copy
}

export { createSeededRng, shuffleWithRng, randomInt }
