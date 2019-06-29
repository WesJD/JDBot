import Debugger from "debug"
import SortedSet from "redis-sorted-set"
import { save, getResponse } from "./chatbot"

const debug = new Debugger("bot:matchers")
const statistics = {
    kills: new SortedSet(),
    deaths: new SortedSet(),
    shotLength: new SortedSet(),
    pointCaptures: new SortedSet()
}
let recording = false

function optimize(matchers) {
    const oldCommands = [].concat(matchers.player.command)
    const commands = matchers.player.command = {}
    oldCommands.forEach(command => {
        command.names.forEach(name => {
            commands[name] = command.handler
        })
    })
    return matchers
}

export default optimize({
    player: {
        command: [
            {
                names: ["echo", "say", "repeat"],
                handler: data => {
                    return `${data.message} -${data.username}`
                }
            },
            {
                names: ["literal"],
                handler: (data, bot) => {
                    if (data.username == "WesJD") {
                        bot.chat(data.message)
                        return "Ok."
                    }
                }
            },
            {
                names: ["forcerecord"],
                handler: (data) => {
                    if (data.username == "WesJD") {
                        recording = true
                        return "Ok."
                    }
                }
            }
        ],
        other: [
            // async ({ message }) => {
            //     try {
            //         await save(message)
            //     } catch (e) {
            //         debug("Couldn't save message to brain", e)
            //     }

            //     try {
            //         return await getResponse(message)
            //     } catch (e) {
            //         debug("Couldn't generate new message", e)
            //         return "I don't know how to respond to that. Perhaps your statement is too short?"
            //     }
            // }
            () => {
                return "I can no longer respond to your messages."
            }
        ]
    },
    server: [
        message => {
            if (message == "The match has started!") {
                recording = true
            }
        },
        message => {
            if (recording) {
                const matches = /(.+) captured (.+)/.exec(message)
                if (matches && matches.length > 1) {
                    statistics.pointCaptures.incrBy(1, matches[1])
                }
            }
        },
        message => {
            if (recording) {
                if (/^(.+) wins!$/.test(message)) {
                    let display = "What a match! "
                    {
                        const top = statistics.kills._tail
                        display += `${top.key} had the most kills with ${top.value} total. `
                    }
                    {
                        const top = statistics.shotLength._tail
                        display += `${top.key} had the longest shot from ${top.value} blocks. `
                    }
                    {
                        const top = statistics.deaths._tail
                        display += `${top.key} died the most with ${top.value} deaths. `
                    }

                    // if (statistics.pointCaptures.length > 0) {
                    //     const top = statistics.pointCaptures._tail
                    //     display += `${top.key} captured the most points with ${top.value} captures. `
                    // }

                    statistics.kills.empty()
                    statistics.shotLength.empty()
                    statistics.deaths.empty()
                    statistics.pointCaptures.empty()

                    return display
                }
            }
        },
        (message, bot) => {
            const splits = message.split(" ")
            const player = bot.players[splits[0]]
            if (player && splits[1] != "placed") {
                statistics.deaths.incrBy(1, player.username)

                const matches = /^[a-zA-Z0-9_-]{3,15}\ (.+)\ by\ ([a-zA-Z0-9_-]{3,15})(.+)?$/.exec(message)
                if (matches && matches.length > 1) {
                    const middle = matches[1]
                    const killer = matches[2]
                    const end = matches[3]

                    if (player.username != killer) { //dont count if you killed yourself
                        statistics.kills.incrBy(1, killer)

                        if (middle.toLowerCase().indexOf("shot") != -1) {
                            const bowMatches = /^from (\d+) blocks$/.exec(end.trim())
                            if (bowMatches && bowMatches.length > 1) {
                                const distance = parseInt(bowMatches[1])
                                if (distance > (statistics.shotLength.get(killer) || 0)) {
                                    statistics.shotLength.set(killer, distance)
                                }

                                if (distance > 85) {
                                    return `Holy shot! ${killer} shot ${player.username} from ${distance} blocks!`
                                }
                            }
                        }
                    }
                }
            }
        }
    ]
})