import Debugger from "debug"
import config from "../config.json"
import { createBot } from "mineflayer"
import matchers from "./matchers"

const debug = new Debugger("bot:main")
let bot = createBot(config.mineflayer)

bindEvents()

function bindEvents() {
    bot.on("login", () => {
        bot.chat("/server mixed")
    })

    bot.on("end", message => {
        debug("Kicked/ended for", message)
        bot = createBot(config.mineflayer)
        bindEvents()
    })

    bot.on("message", chatMessage => {
        const message = chatMessage.toString()
        const matches = /((?:\(|\[)Team(?:\)|\]) |\[PM\] From )?(\[.+\] )?<?\*?([a-zA-Z0-9_-]{3,15})>?: (.+)/.exec(message)
        if (matches && matches.length > 1) {
            const data = {
                isTeamChat: matches[1] != undefined,
                isPM: matches[1] == "[PM] From ",
                staffRank: matches[2],
                username: matches[3],
                message: matches[4]
            }
            if (data.isPM || data.message.toLowerCase().startsWith(bot.username.toLowerCase())) {
                if (!data.isPM) {
                    data.message = data.message.substring(bot.username.length).trim()
                }

                let prefix = "/g "
                if (data.isTeamChat) {
                    prefix = ""
                } else if (data.isPM) {
                    prefix = "/msg " + data.username + " "
                }

                const splits = data.message.split(" ")
                const command = matchers.player.command[splits[0]]
                if (command) {
                    data.message = splits.slice(1).join(" ")
                    const response = command(data, bot)
                    if (response != undefined && response != null) {
                        bot.chat(prefix + response)
                    }
                } else {
                    runMatchers(data, matchers.player.other, prefix).catch(err => debug("Couldn't run matchers", err))
                }
            }
        } else {
            runMatchers(message, matchers.server, "/g ").catch(err => debug("Couldn't run matchers", err))
        }
    })
}

async function runMatchers(args, array, prefix = "") {
    let response
    for (const matcher of array) {
        response = await matcher(args, bot)
        if (response != undefined && response != null) {
            break
        }
    }

    if (response != undefined && response != null) {
        bot.chat(prefix + response)
    }
}

setInterval(() => {
    bot.chat("/server mixed")
}, 1000 * 60)