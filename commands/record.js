const Discord = require('discord.js');
const GameData = require('../class/gameData.js');
const fs = require('fs');
const symbol = ["☗", "☖"];

module.exports = {
    data: new Discord.SlashCommandBuilder()
    .setName('record')
    .setDescription('回顧一場對戰紀錄')
    .addStringOption(opt => 
        opt.setName('game-id')
            .setDescription('要回顧的遊戲紀錄ID。可以在那場對戰的訊息中找到。')
            .setRequired(true)
    ),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        await interaction.deferReply();
        /**
         * @type {String}
         */
        const gameID = interaction.options.get('game-id').value;
        let player = 0;
        const files = fs.readdirSync('./data/gameData').filter(file => file === (gameID + '.json'));
        if(files.length === 0) return interaction.editReply("搜尋不到這筆對戰資料。");
        let data = fs.readFileSync(`./data/gameData/${files[0]}`);
        let gamedata = JSON.parse(data);
        const gameData = new GameData.GameData();
        gameData.toData(gamedata);
        const sente = await interaction.client.users.fetch(gameData.playerSente);
        const gote = await interaction.client.users.fetch(gameData.playerGote);
        let returnData = 
            `對戰ID ${gameID} 的資料：\n` + 
            `對戰開始時間：<t:${gameData.time}:f>\n` +
            `${symbol[0]}先手：<@${gameData.playerSente}> (${sente.tag})\n` +
            `${symbol[1]}後手：<@${gameData.playerGote}> (${gote.tag})\n\n`;
        await interaction.editReply(returnData);

        let playing = "";
        for(let i = 0; i < gameData.steps; i++) {
            let a = "";
            a += symbol[i % 2] + gameData.runOneStep(i);
            a = a.padEnd(5, "　");
            a += (i % 2 === 0 ? "" : "\n");
            playing += a;
            if(i % 100 === 0 && i !== 0) {
                await interaction.followUp(playing);
                playing = "";
            }
        }
        await interaction.followUp(playing);
        await interaction.followUp({
            content: gameData.steps % 2 ? `由 <@${gameData.playerSente}> (${sente.tag}) 獲勝。` : `由 <@${gameData.playerGote}> (${gote.tag}) 獲勝。`,
            allowedMentions: {repliedUser: false}
        });
    }
}