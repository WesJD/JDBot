import { join } from "path"
import keyword from "keyword-extractor"
import Sentiment from "sentiment"
import { Brain, FileSystemProvider } from "node-brain/lib/node-brain"
import config from "../config.json"
import { createPool } from "mysql2/promise"

const provider = new FileSystemProvider(join(__dirname, "..", "BRAIN"))
const brain = new Brain({ provider })
const sentiment = new Sentiment()
let mysql

export async function initialize() {
    await provider.initialize()

    mysql = await createPool(config.mysql)
    await mysql.query("CREATE TABLE IF NOT EXISTS sentences (sentence VARCHAR(100) NOT NULL, UNIQUE(sentence))")
    const [rows] = await mysql.query("SELECT * FROM sentences")
    for (const row of rows) {
        await brain.addSentence(row.sentence)
    }
}

export async function save(message) {
    if (!/[^a-zA-Z0-9,.\- !?_+%$#@=""]/.test(message)
        && sentiment.analyze(message).score >= 0) {
        await brain.addSentence(message)
        await mysql.query("INSERT IGNORE INTO sentences (sentence) VALUES (?)", [message])
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