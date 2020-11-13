const Discord = require('discord.js')
const config = require('./config.json')
const axios = require('axios')
// const isEmpty = requre

const client = new Discord.Client()

const stockExists = quote => {
    let exists = false
    Object.values(quote).map(a => {
        if (a !== 0) exists = true
    })
    return exists
}

const unixTsToDt = unixTs => {
    var a = new Date(unixTs * 1000);
    var year = a.getFullYear();
    var month = a.getMonth() + 1;
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + '/' + month + '/' + year + ' ' + hour + ':' + min;
    return time;

}

client.on('ready', () => {
    console.log('UncleJi is awake!')
})

const prefix = 'ji'

const baseUrl = 'https://finnhub.io/api/v1/'

client.on('message', (message) => {
    // message.reply('yooooooo')

    if (message.content.toLowerCase().includes('anime')) {
        message.guild.member(message.author).kick()
    }

    if (message.author.bot) return
    if (!message.content.toLowerCase().startsWith(prefix)) return

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    console.log('Command: ' + command)

    if (command === 'salaam' || command === 'salam') {
        // message.reply('WALAIKUMASSALAM JANAAB')
        message.channel.send('WALAIKUMASSALAM JANAAB')
    }

    if (command === 'ping') {
        const timeTaken = Date.now() - message.createdTimestamp
        message.reply(`UncleJi has a latency of of ${timeTaken}ms.`)
    }

    if (command === 'team') {
        if (args.length === 0) {
            message.channel.send('You have to give me a team name')
            return
        }
        const team = args.join(' ')
        if (team.toLowerCase() === 'chelsea') {
            return message.guild
                .member(message.author)
                .kick()
                .then(() =>
                    message.channel.send(
                        'Chelsea is a dead team, you have been kicked from the server lol'
                    )
                )
                .catch((err) =>
                    message.channel.send(
                        "Chelsea is a dead team but uncle ji hasn't eaten his biryani yet so you can stay"
                    )
                )
        }
        message.channel.send(team + ' is a good team')
    }

    if (command === 'donttestme') {
        console.log(message)
        const user = message.mentions.users.first()
        if (!user) return message.channel.send('blah')
        const member = message.guild.member(user)
        if (!member) return message.channel.send('blah1')
        member.kick().then(() => {
            message.channel.send('dont test uncleji ' + user.tag + ' was kicked')
        }).catch(err => 'my bad g, ur too hench for me to remove you')
    }

    if (command === 'p' || command === 'price') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toUpperCase();
        const url = baseUrl + 'quote?symbol=' + ticker + '&token=' + config.FINHUB_KEY
        axios.get(url).then(response => {
            console.log(response.data)
            console.log(stockExists(response.data))
            if (!stockExists(response.data)) return message.channel.send('I can\'t find a stock with the ticker ' + ticker)
            const price = response.data.c
            message.channel.send('The last quote for ' + ticker + ' is **' + price + '**.')
        }).catch(err => message.channel.send('Something went wrong: ' + err))
    }

    if (command === 'n' || command === 'news') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toUpperCase();
        const count = args.length === 0 || Number(args[0]) === NaN ? 10 : Number(args[0])

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
        const date2 = yesterday.getFullYear() + '-' + (yesterday.getMonth() + 1) + '-' + yesterday.getDate()

        const url = baseUrl + 'company-news?symbol=' + ticker + '&from=' + date2 + '&to=' + date + '&token=' + config.FINHUB_KEY
        console.log(url)
        axios.get(url).then(res => {
            if (res.data.length === 0) return message.channel.send('I can\'t find news for ' + ticker)
            const data = res.data[0]
            message.channel.send('**' + data.headline + '**')
            message.channel.send(`(${data.related}) ${data.source} *${unixTsToDt(data.datetime)}*`)
            message.channel.send('==============')
            message.channel.send(data.summary)
        })
    }
})

client.login(config.BOT_TOKEN)
