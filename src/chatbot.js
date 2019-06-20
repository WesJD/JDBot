import { join } from "path"
import keyword from "keyword-extractor"
import Sentiment from "sentiment"
import { Brain, FileSystemProvider } from "node-brain/lib/node-brain"

const provider = new FileSystemProvider(join(__dirname, "..", "BRAIN"))
const brain = new Brain({ provider })
const sentiment = new Sentiment()

export async function initialize() {
    await provider.initialize()
}

export async function save(message) {
    if (!/[^a-zA-Z0-9,.\- !?_+%$#@=""]/.test(message)
        && sentiment.analyze(message).score >= 0) {
        await brain.addSentence(message)
    }
}

export async function getResponse(message) {
    const keywords = keyword.extract(message, {
        language: "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: false
    })
    const array = keywords.length > 0 ? keywords : trimmed.split(/[ .!?]/g)
    return await brain.getSentence(array[Math.floor(array.length * Math.random())])
}