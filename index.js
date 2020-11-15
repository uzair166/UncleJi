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

const round = (num, dp) => {
    return Math.round(num * Math.pow(10, dp)) / Math.pow(10, dp)
}

const createUrl = (endpoint, params) => {
    let baseUrl = 'https://finnhub.io/api/v1/'
    baseUrl += endpoint + '?token=' + config.FINHUB_KEY
    Object.entries(params).map(([key, value]) => {
        baseUrl += '&' + key + '=' + value
    })
    return baseUrl
}

client.on('ready', () => {
    console.log('UncleJi is awake!')
})

const prefix = 'ji'



client.on('message', (message) => {
    // message.reply('yooooooo')

    // if (message.content.toLowerCase().includes('anime')) {
    //     message.guild.member(message.author).kick()
    // }

    if (message.author.bot) return
    if (!message.content.toLowerCase().startsWith(prefix)) return

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    console.log('Command: ' + command)

    // if (command === 'salaam' || command === 'salam') {
    //     // message.reply('WALAIKUMASSALAM JANAAB')
    //     message.channel.send('WALAIKUMASSALAM JANAAB')
    // }

    // if (command === 'ping') {
    //     const timeTaken = Date.now() - message.createdTimestamp
    //     message.reply(`UncleJi has a latency of of ${timeTaken}ms.`)
    // }

    // if (command === 'team') {
    //     if (args.length === 0) {
    //         message.channel.send('You have to give me a team name')
    //         return
    //     }
    //     const team = args.join(' ')
    //     if (team.toLowerCase() === 'chelsea') {
    //         return message.guild
    //             .member(message.author)
    //             .kick()
    //             .then(() =>
    //                 message.channel.send(
    //                     'Chelsea is a dead team, you have been kicked from the server lol'
    //                 )
    //             )
    //             .catch((err) =>
    //                 message.channel.send(
    //                     "Chelsea is a dead team but uncle ji hasn't eaten his biryani yet so you can stay"
    //                 )
    //             )
    //     }
    //     message.channel.send(team + ' is a good team')
    // }

    // if (command === 'donttestme') {
    //     console.log(message)
    //     const user = message.mentions.users.first()
    //     if (!user) return message.channel.send('blah')
    //     const member = message.guild.member(user)
    //     if (!member) return message.channel.send('blah1')
    //     member.kick().then(() => {
    //         message.channel.send('dont test uncleji ' + user.tag + ' was kicked')
    //     }).catch(err => 'my bad g, ur too hench for me to remove you')
    // }

    if (command === 'p' || command === 'price') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toUpperCase();
        const url = createUrl('quote', { symbol: ticker })
        console.log(url)
        axios.get(url).then(response => {
            console.log(response.data)
            console.log(stockExists(response.data))
            if (!stockExists(response.data)) return message.channel.send('I can\'t find a stock with the ticker ' + ticker)
            const price = response.data.c
            let change = Math.round(((Math.abs(response.data.c - response.data.pc)) / response.data.pc) * 10000) / 100
            if (response.data.c < response.data.pc) change = change * -1
            message.channel.send('The last quote for ' + ticker + ' is **' + price + '** (' + change + '%)')
        }).catch(err => message.channel.send('Something went wrong: ' + err))
    }

    if (command === 'n' || command === 'news') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toUpperCase();
        const count = args.length === 0 || Number(args[0]) === NaN ? 5 : Number(args[0])

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
        const date2 = yesterday.getFullYear() + '-' + (yesterday.getMonth() + 1) + '-' + yesterday.getDate()

        const url = createUrl('company-news', { symbol: ticker, from: date2, to: date })
        axios.get(url).then(res => {
            if (res.data.length === 0) return message.channel.send('I can\'t find news for ' + ticker)
            console.log(res.data.length)
            res.data.slice(0, 5).map(newsItem => {
                const embed = new Discord.MessageEmbed()
                    .setColor('#BDA0CB')
                    .setTitle(newsItem.headline)
                    .setURL(newsItem.url)
                    .setAuthor(newsItem.source)
                    .setTimestamp(new Date(newsItem.datetime * 1000))
                    .setDescription(newsItem.summary)
                    .setFooter(newsItem.related)
                message.channel.send(embed)
            })
        })
    }
    if (command === 'earnings' || command === 'e') {
        const today = new Date()
        const weekLater = new Date(today)
        weekLater.setDate(today.getDate() + 7)
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
        const date2 = weekLater.getFullYear() + '-' + (weekLater.getMonth() + 1) + '-' + weekLater.getDate()
        console.log(date2)

        const url = createUrl('calendar/earnings', { from: date, to: date2 })
        console.log(url + '')
        let prevDate = ''

        axios.get(url).then(res => {
            // console.log(res.data.earningsCalendar)
            let earningsByDay = {}
            res.data.earningsCalendar.reverse().map(e => earningsByDay[e.date] ? earningsByDay[e.date].push(e) : earningsByDay[e.date] = [e])
            // console.log(earningsByDay)
            let embed
            Object.values(earningsByDay).map(day => {
                console.log(day)
                embed = new Discord.MessageEmbed()
                    .setTitle('Earning for ' + day[0].date)
                day.map(earning => {
                    embed.addField(earning.symbol, 'Forecast EPS: __' + round(earning.epsEstimate, 2) + '__', true)
                })
                message.channel.send(embed)
            })


        })
    }
})

client.login(config.BOT_TOKEN)
