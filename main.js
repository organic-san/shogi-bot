const Discord = require('discord.js');

const fs = require('fs');
require('dotenv').config();

const options = {
    restTimeOffset: 100,
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.DirectMessages,
    ],
};

const client = new Discord.Client(options);
client.login(process.env.DCKEY_TOKEN);

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

let isready = false;

client.on('ready', () =>{
    console.log(`登入成功: ${client.user.tag} 於 ${new Date()}`);
    //client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);
    setTimeout(() => {
        console.log(`設定成功: ${new Date()}`);
        isready = true;
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        }, parseInt(process.env.LOADTIME) * 1000);
    
});

client.on('interactionCreate', async interaction => {
    if(!isready) return;

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");
    if(!interaction.guild) return;

    if (!interaction.isCommand()) return;

    //讀取指令ID，過濾無法執行(沒有檔案)的指令
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", id: " + interaction.commandId + ", guild: " + interaction.guild.name)
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

    try {
        if(command.tag === "interaction") await command.execute(interaction);

	} catch (error) {
		console.error(error);
        try {
            if(interaction.replied) 
                interaction.editReply({ content: '糟糕! 好像出了點錯誤!', embeds: [], components: [] })//.catch(() => {});
            else
                interaction.reply({ content: '糟糕! 好像出了點錯誤!', ephemeral: true })//.catch(() => {});
        }catch(err) {
            console.log(err);
        }
		
	}

});

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
    let now = new Date(Date.now());
    let filename = `./error/${now.getFullYear()}#${now.getMonth()+1}#${now.getDate()}-${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}#${now.getMilliseconds()}s.txt`;
    fs.writeFile(filename, JSON.stringify(error, null, '\t'), function (err){
        if (err)
            console.log(err);
    });
    client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`<@${process.env.OWNER1ID}>，ERROR`)).catch(() => {});
});


