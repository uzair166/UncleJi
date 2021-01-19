const Discord = require('discord.js')
const config = require('./config.json')
const axios = require('axios')
const cheerio = require('cheerio');
const fs = require('fs');
const { get } = require('http');
// const isEmpty = requre

const client = new Discord.Client()

let keyCounter = 0

let watchlists

const getFinnhubKey = () => {
    if (keyCounter === config.FINHUB_KEYS.length) keyCounter = 0
    console.log('Using api key ' + keyCounter)
    return config.FINHUB_KEYS[keyCounter++]
}

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
    baseUrl += endpoint + '?token=' + getFinnhubKey()
    Object.entries(params).map(([key, value]) => {
        baseUrl += '&' + key + '=' + value
    })
    return baseUrl
}

const saveWatchlist = wl => {
    try {
        fs.writeFileSync('watchlists.json', JSON.stringify(wl))
        return true
    } catch (err) {
        return false
    }
}

const getPrice = (ticker, message) => {
    const url = createUrl('quote', { symbol: ticker })
    console.log(url)
    axios.get(url).then(response => {
        console.log(response.data)
        console.log(stockExists(response.data))
        if (!stockExists(response.data)) return message.channel.send('I can\'t find a stock with the ticker ' + ticker)
        const price = response.data.c
        let change = Math.round(((Math.abs(response.data.c - response.data.pc)) / response.data.pc) * 10000) / 100
        if (response.data.c < response.data.pc) change = change * -1
        message.channel.send('The latest quote for ' + ticker + ' is **' + price + '** (' + change + '%)')
    }).catch(err => message.channel.send('[' + ticker + '] Something went wrong: ' + err))

}

const getAhPrice = (ticker, message) => {
    axios.get('https://www.marketwatch.com/investing/stock/' + ticker).then(res => {
        if (res.data.includes('Symbol Lookup')) return message.channel.send('I can\'t find a stock with the ticker ' + ticker)
        const $ = cheerio.load(res.data);
        const price = $('h3.intraday__price > .value').text().trim().split(',').join('')
        const closePrice = $('div.intraday__close > table > tbody tr > td').first().text().trim().split(',').join('').split('$').join('').split('£').join('').split('p').join('').split('c').join('')
        console.log('price: ' + price + ' closeprice: ' + closePrice)
        if (isNaN(price) || isNaN(closePrice)) return message.channel.send('Something went wrong.')
        let change = Math.round(((Math.abs(price - closePrice)) / closePrice) * 10000) / 100

        if (price < closePrice) change = change * -1
        return message.channel.send('The latest quote for ' + ticker + ' is **' + price + '** (' + change + '%)')
        // console.log('closeprice:', closePrice, price)
        // message.channel.send('The last quote for ' + ticker + ' is **' + price + '** (' + change + '%)')
    })

}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

client.on('ready', () => {
    console.log('UncleJi is awake!')
    // Check for watchlists file
    console.log(client)
    client.guilds.cache.forEach(server => {
        console.log(server.name + " id: " + server.id);
    });

    const servers = client.guilds.cache.map(server => server.id)
    watchlists = {}

    try {
        if (fs.existsSync('watchlists.json')) {
            console.log('file exists')
            const data = fs.readFileSync('watchlists.json')
            watchlists = JSON.parse(data)
        } else {
            console.log('file does not exist')
            fs.writeFileSync('watchlists.json', JSON.stringify(watchlists), () => {
                console.log('file created')
            })
        }
    } catch (err) {
        console.error(err)
    }

    console.log('watchlists', watchlists)



    const channel = client.channels.cache.find(i => i.name === 'news-feed')
    if (channel) {
        // channel.send('getting news')
        let minId
        setInterval(() => {
            try {
                let url
                if (!minId) url = createUrl('news', { category: 'general' })
                else url = createUrl('news', { category: 'general', minId: minId })
                console.log('url: ', url)

                axios.get(url).then(res => {
                    console.log('got this much news: ', res.data.length)
                    if (res.data.length === 0) return
                    if (!minId) return minId = res.data[0].id
                    if (minId === res.data[0].id) return
                    const news = res.data
                    minId = news[0].id
                    news.map(newsItem => {
                        const embed = new Discord.MessageEmbed()
                            .setColor('#BDA0CB')
                            .setTitle(newsItem.headline)
                            .setURL(newsItem.url)
                            .setAuthor(newsItem.source)
                            .setTimestamp(new Date(newsItem.datetime * 1000))
                            .setDescription(newsItem.summary)
                            .setFooter(newsItem.related.length !== 0 ? '(' + newsItem.related.join(', ') + ')' : '')
                        channel.send(embed)
                    })
                }).catch(err => console.log(err))
            } catch (e) {
                console.log(error)
            }
        }, 600000)
        // }, 10000)

    }

    const channel2 = client.channels.cache.find(i => i.name === 'general-chat')
    if (channel2) {
        let now = new Date()
        let time = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            14, 29, 55 // ...at 00:00:00 hours
        )
        let msToThen = time.getTime() - now.getTime();
        // let i = 5;
        setTimeout(() => {
            channel2.send('MARKET OPENS IN 5').then(sentMessage => {
                for (let i = 4; i > 0; i--) {
                    setTimeout(() => { sentMessage.edit('MARKET OPENS IN ' + i + '') }, (5 - i) * 1000)
                }
                setTimeout(() => {
                    sentMessage.delete()
                    channel2.send("MARKET IS OPEN!")
                }, 5000)
            })

        }, msToThen)

    }
})

const prefix = 'ji'



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


    if (command === 'help') {
        const embed = new Discord.MessageEmbed()
            .setTitle('UncleJi Command List')
            .setDescription('All commands need to begin with the prefix \'ji\'.\n<something>    -->    replace with a value\n<something?>    -->    optional')
            .addField('price <ticker> | p <ticker>', 'Real time price for US stocks.\n> ji price AAPL\n> ji p aapl')
            .addField('afterhours <ticker> | ah <ticker>', 'After hours price for US stocks. Shows the percentage change since price at close. Can be used when market is open and will give current price but is slower than price command.\n> ji afterhours AAPL\n> ji ah aapl')
            .addField('news <ticker> <count?> | n <ticker> <count?>', 'List latest company news by symbol from the past 24 hours. Lists 5 values by default. Only available for north ameircan companies.\n> ji news AAPL\n> ji n aapl 3\n')
            .addField('earnigns <period?> | e <period?>', 'Get earnings release info for the specified period. If no period specified will give the earning releasing **today**. Period can be \'**today**\', \'**tomorrow**\', \'**week**\' or two dates in the format \'**YYYY-MM-DD**\'.\n> ji earnings\n> ji earnings tomorrow\n> ji e week\n> ji e 2021/01/15 2021/01/18\n')
            .addField('**profile <ticker> | pr <ticker>**',
                `Get the general information of a company by providing their ticker.
                > ji pr aapl`
            )
            .addField('**supportresistance <ticker> <timeresolutions?> | sr <ticker> <timeresolutions?>**',
                `Get the support resistance level for a symol and a time resolution, if no time reolution is provided **D** (daily) will be used. 
                Supported resolutions are **1**, **5**, **15**, **30**, **60**, **D**, **W**, **M**
                > ji supportresistance aapl
                > ji sr aapl 60`
            )
        message.channel.send(embed)
    }

    if (command === 'shit') {
        message.channel.send('https://www.youtube.com/watch?v=6ynqDVGcnXw')
    }

    if (command === 'p' || command === 'price') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toUpperCase();
        if (ticker === 'WL' || ticker === 'WATCHLIST') {
            const server = message.guild.id
            const user = message.author.id
            watchlists[server][user].map(t => getPrice(t, message))
        } else {
            getPrice(ticker, message)
        }
    }

    if (command === 'n' || command === 'news') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toUpperCase();
        const count = args.length === 0 || isNaN(args[0]) ? 5 : Number(args[0])

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 6)
        const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate()
        const date2 = yesterday.getFullYear() + '-' + (yesterday.getMonth() + 1) + '-' + yesterday.getDate()

        const url = createUrl('company-news', { symbol: ticker, from: date2, to: date })
        axios.get(url).then(res => {
            if (res.data.length === 0) return message.channel.send('I can\'t find news for ' + ticker)
            console.log(res.data.length)
            res.data.slice(0, count).map(newsItem => {
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
        let d1 = new Date()
        let d2 = new Date(d1)
        let custom = false
        // weekLater.setDate(d1.getDate() + 7)
        if (args.length !== 0) {
            const period = args.shift().toLowerCase()
            if (period === 'tomorrow') {
                d1.setDate(d1.getDate() + 1)
                d2 = d1
            } else if (period === 'week') {
                d2.setDate(d1.getDate() + 6)
            } else if (args.length !== 0) {
                custom = true
                d1 = period
                d2 = args.shift().toLowerCase()
            }
        }
        const date = custom ? d1 : d1.getFullYear() + '-' + (d1.getMonth() + 1) + '-' + d1.getDate()
        const date2 = custom ? d2 : d2.getFullYear() + '-' + (d2.getMonth() + 1) + '-' + d2.getDate()
        console.log(date2)

        const url = createUrl('calendar/earnings', { from: date, to: date2 })
        console.log(url + '')
        let prevDate = ''

        axios.get(url).then(res => {
            // console.log(res.data.earningsCalendar)
            let earningsByDay = {}
            if (!res.data.earningsCalendar || res.data.earningsCalendar) message.channel.send('I can\'t find any earnings for that period')
            res.data.earningsCalendar.reverse().map(e => earningsByDay[e.date] ? earningsByDay[e.date].push(e) : earningsByDay[e.date] = [e])
            let embed
            Object.values(earningsByDay).map(day => {
                console.log(day)
                embed = new Discord.MessageEmbed()
                    .setTitle('Earning for ' + day[0].date)
                embed.addField('Company', day.reduce((agg, val) => agg += val.symbol + '\n', ''), true)
                embed.addField('Forecast EPS', day.reduce((agg, val) => agg += round(val.epsEstimate, 2) + '\n', ''), true)
                embed.addField('Reporting', day.reduce((agg, val) => agg += (val.hour === 'bmo' ? 'Before bell' : 'After Bell') + '\n', ''), true)
                message.channel.send(embed)
            })


        })
    }

    if (command === 'afterhours' || command === 'ah') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the price of.')
        const ticker = args.shift().toLowerCase();
        if (ticker === 'wl' || ticker === 'watchlist') {
            const server = message.guild.id
            const user = message.author.id
            watchlists[server][user].map(t => getAhPrice(t, message))
        } else {
            console.log('in else')
            return getAhPrice(ticker, message)
        }
    }

    if (command === 'profile' || command === 'pr') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the profile for.')
        const ticker = args.shift().toUpperCase()
        const url = createUrl('stock/profile2', { symbol: ticker })
        axios.get(url).then(({ data }) => {
            if (Object.keys(data).length === 0) return message.channel.send('I can\'t find a stock with the ticker ' + ticker)
            const embed = new Discord.MessageEmbed()
                .setAuthor(`${data.exchange} (${data.country})`)
                .setTitle(data.name)
                .setURL(data.weburl)
                .setFooter(data.finnhubIndustry, data.logo)
                .setDescription(
                    `Market cap: ${numberWithCommas(data.marketCapitalization)}
                    Shares outstanding: ${numberWithCommas(data.shareOutstanding)}
                    IPO date: ${data.ipo}`
                )
            message.channel.send(embed)
        }).catch(err => {
            console.error('Profile Error:', err)
            message.channel.send('Something went wrong')
        })
    }

    if (command === 'supportresistance' || command === 'sr') {
        if (args.length === 0) return message.channel.send('You need to provide a stock you want the profile for.')
        const ticker = args.shift().toUpperCase()
        const url = args.length === 0
            ? createUrl('scan/support-resistance', { symbol: ticker, resolution: '240' })
            : createUrl('scan/support-resistance', { symbol: ticker, resolution: args.shift().toUpperCase() })
        axios.get(url).then(({ data }) => {
            console.log(data)
            if (Object.keys(data).length === 0) return message.channel.send('I can\'t find a stock with the ticker ' + ticker + ' or the time resolution you provided was invalid.')
            const embed = new Discord.MessageEmbed()
                .setTitle('Support and Resistance levels for ' + ticker)
                .setDescription(data.levels.reduce((str, level) => str += (round(level, 2) + '\n'), ''))
            message.channel.send(embed)
        }).catch(err => {
            console.error('Support Resistance Error:', err)
            message.channel.send('Something went wrong')
        })
    }

    if (command === 'watchlist' || command === 'wl') {
        const server = message.guild.id
        const user = message.author.id
        if (args.length === 0) {
            if (!watchlists[server] || !watchlists[server][user] || watchlists[server][user].length === 0) {
                message.channel.send('Your watchlist is empty.')
            }
            else {
                message.channel.send(watchlists[server][user].join('\n'))
            }
        }
        else {
            const command2 = args.shift().toLowerCase()
            if (command2 === 'a' || command2 === 'add') {
                if (args.length === 0) return message.channel.send('You need to provide a stock ticker you want to add to your watchlist.')
                const ticker = args.shift().toUpperCase();
                if (!watchlists[server]) watchlists[server] = {}
                if (!watchlists[server][user]) watchlists[server][user] = []
                if (watchlists[server][user].includes(ticker)) return message.channel.send(ticker + ' is already in your watchlist')
                if (watchlists[server][user].length === 5) return message.channel.send('You already have 5 stocks in your watchlist, please try removing one first!')
                watchlists[server][user].push(ticker)
                if (saveWatchlist(watchlists)) {
                    return message.channel.send(ticker + " has been added to your watchlist");
                }
                else {
                    watchlists[server][user].pop()
                    return message.channel.send("There was an error trying to save your watchlist (maybe someone else was trying to save at the same time) please try again.")
                }
            }
            else if (command2 === 'r' || command2 === 'remove') {
                if (args.length === 0) return message.channel.send('You need to provide a stock ticker you want to remove from your watchlist.')
                if (!watchlists[server] || !watchlists[server][user] || watchlists[server][user].length === 0) {
                    return message.channel.send('Your watchlist is empty.')
                }
                const ticker = args.shift().toUpperCase();
                const index = watchlists[server][user].indexOf(ticker)
                if (index > -1) {
                    watchlists[server][user].splice(index, 1);
                    if (saveWatchlist(watchlists)) {
                        return message.channel.send(ticker + ' has successfully been removed from your watchlist')
                    } else {
                        return message.channel.send("There was an error trying to save your watchlist (maybe someone else was trying to save at the same time) please try again.")
                    }
                } else {
                    return message.channel.send(ticker + ' is not in your watchlist')
                }


            }
        }
    }
})

client.login(config.BOT_TOKEN)
// client.login(config.TEST_BOT_TOEKN)