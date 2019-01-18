const puppeteer = require('puppeteer')
const config = require('./config')
const { promisify } = require('util')
const readdir = promisify(require('fs').readdir)
const fs = require('fs')
const https = require('https')
const http = require('http')
const Discord = require('discord.js')
const express = require('express')
const app = express()
const client = new Discord.Client()
require('./Utils/functions.js')(client)
client.commands = new Discord.Collection()

/**
 * Discord Events
 */

client.on('error', err => {
  console.log(`Got an error from discord x_x. ${err}`)
})

/**
 * Initalize Discord
 */
const initDiscord = async () => {
  const cmdFiles = await readdir('./Commands/')
  console.log(`Loading a total of ${cmdFiles.length} commands.`)
  cmdFiles.forEach(f => {
    if (!f.endsWith('.js')) return
    const response = client.loadCommand(f)
    if (response) console.log(response)
  })
  // Then we load events, which will include our message and ready event.
  const evtFiles = await readdir('./Events/')
  console.log(`Loading a total of ${evtFiles.length} events.`)
  evtFiles.forEach(file => {
    const eventName = file.split('.')[0]
    console.log(`Loading Event: ${eventName}`)
    const event = require(`./Events/${file}`)
    // Bind the client to any event, before the existing arguments
    // provided by the discord.js event.
    // This line is awesome by the way. Just sayin'.
    client.on(eventName, event.bind(null, client))
  })

  await client.login(config.Discord.TOKEN)
}

// Main function
const initSATAROSS = async () => {
  await initDiscord().then(async () => {
    console.log(`SATAROSS Ready and Started!`)
  })
  // Get current date and time
  let currentTime = await require('./Utils/utils').getDateAndTime()

  // Get Discord log channel
  const logChannel = client.guilds
    .get(config.Discord.LOG_SERVER)
    .channels.get(config.Discord.LOG_CHANNEL)

  while (true) {
    for (let link of config.LinkList) {
      const browser = await puppeteer.launch({
        /**
         * Required on linux systems in headless mode
         */
        args: ['--no-sandbox'],
        /**
         * headless sets whether a browser page is displayed or not
         * set to false to see a browser window
         * set to true to run invisible
         */
        headless: config.HEADLESS
      })
      const page = await browser.newPage()
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'
      )
      await page.setViewport({
        width: 1920,
        height: 1080
      })
      await page.goto(link)

      await require('./Utils/utils').wait(config.REDIRECT_WAIT_TIME)
      /* await page
        .waitForNavigation({
          timeout: config.REDIRECT_WAIT_TIME,
          waitUntil: 'networkidle0'
        }) */

      // Write the link
      fs.appendFile(
        config.SCANNED_LINKS_LOG,
        currentTime + ' ' + page.url() + '\n',
        err => {
          if (err) throw err
        }
      )
      //

      const found = /virus|infected|pornographic|spyware|riskware|locked|microsoft|technician/i.test(
        await page.content()
      )

      // This will print true or false
      console.log(found)
      if (found) {
        // Write the link
        fs.appendFile(
          config.SCAM_LINK_LOG,
          currentTime + ' ' + page.url() + '\n',
          err => {
            if (err) throw err
          }
        )
        //

        console.log('posible scam site')
        await page.screenshot({
          path: `./data/${currentTime}.png`
        })

        let embed = new Discord.RichEmbed()
          .setAuthor(client.user.username, client.user.avatarURL)
          .setColor('#FF0000')
          .setTitle(`Possible Scam Site Found!`)
          .addField(`URL`, await page.url(), true)
          .setTimestamp()
          .setThumbnail(
            `http://puyodead1-development.me:2685/img/${currentTime}.png`
          )
          .setFooter(
            `SATAROSS by Puyodead1 and Puyodead1 Development`,
            client.user.avatarURL
          )
        await logChannel.send(embed)
      }
      await browser.close()
    }
  }
}

/**
 * This is for DEVELOPMENT ONLY
 */
process.on('unhandledRejection', async err => {
  const logChannel = client.guilds
    .get(config.Discord.LOG_SERVER)
    .channels.get(config.Discord.LOG_CHANNEL)
  console.log('Houston, We have a problem!' + err.stack)

  let errorEmbed = new Discord.RichEmbed()
    .setAuthor(client.user.username, client.user.avatarURL)
    .setColor('#FF0000')
    .setTitle(`Houston, We have a problem!`)
    .setDescription(`An error was cought! To be safe, SATAROSS will shutdown!`)
    .addField(`Error Message`, err.message, true)
    .setTimestamp()
    .setFooter(
      `SATAROSS by Puyodead1 and Puyodead1 Development`,
      client.user.avatarURL
    )
    .setThumbnail(
      'https://cdn.pixabay.com/photo/2015/06/09/16/12/error-803716__340.png'
    )

  await logChannel.send(errorEmbed)
  return process.exit(1)
})

const initExpress = async () => {
  app.use(express.static('./views/public'))
  app.use('/img', express.static('./data'))
  app.set('view engine', 'ejs')
  app.get('/', function (req, res) {
    res.render('pages/index')
  })

  http.createServer(app).listen(config.Express.HTTP_PORT)
  https
    .createServer(
      {
        key: fs.readFileSync(config.Express.KEY_FILE),
        cert: fs.readFileSync(config.Express.CRT_FILE)
      },
      app
    )
    .listen(config.Express.HTTPS_PORT, function () {
      console.log(`HTTPS ready at port ${config.Express.HTTPS_PORT}`)
    })
  console.log(`HTTP ready at port ${config.Express.HTTP_PORT}`)
}

// initDiscord()
initExpress()
initSATAROSS()
