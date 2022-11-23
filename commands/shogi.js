const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
    .setName('shogi')
    .setDescription('進行一場五子棋遊戲')
    .addUserOption(opt => 
        opt.setName('player')
            .setDescription('要共同遊玩的玩家。')
            .setRequired(true)
    ).addNumberOption(opt => 
        opt.setName('offensive')
            .setDescription('選擇要先手的玩家。')
            .addChoices(
                { name: '發起遊戲的玩家', value: 1 },
                { name: '收到邀請的玩家', value: 2 },
                { name: '隨機決定', value: 3 },
            )
            .setRequired(true)
    ),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
		const user = [interaction.user, interaction.options.getUser('player')]
        const offensive = interaction.options.getNumber('offensive');
        //const kinjite = interaction.options.getBoolean('kinjite');
        if(user[1].bot) return interaction.reply("無法向機器人發送遊玩邀請。");
        //TODO: AI五子棋玩家
        if(user[1].id === user[0].id) return interaction.reply("無法向自己發送遊玩邀請。");

        const help = 
            "將棋 - 遊戲說明: \n" + 
            "主要以捕獲對方玉將為原則。\n" + 
            "詳細說明請參照維基百科：<https://zh.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E5%B0%86%E6%A3%8B>\n" +
            "為簡化規則，目前無法做出入玉宣言。" +
            (offensive === 1 ? `${user[0]} (${user[0].tag}) 為先手。` : 
                (offensive === 2 ? `${user[1]} (${user[1].tag}) 為先手。` : "先後手將隨機決定。"));
            
        const OKbutton = new Discord.ActionRowBuilder().addComponents(
            new Discord.ButtonBuilder()
                .setLabel("開始遊戲")
                .setCustomId('OK')
                .setStyle(Discord.ButtonStyle.Primary)
            );
        /**
         * @type {Discord.Message<boolean>}
         */

         let mainMsg = await interaction.reply({
            content: "已經將說明與開始遊玩發送至你的私訊，請檢查私訊...", 
            fetchReply: true
        });

        let lc =`\n\n點選下方按鈕，向 ${user[1]} (${user[1].tag}) 發送邀請。`
        let isErr = false;
        /**
         * @type {Array<Discord.Message<boolean>>}
         */
        let message = [await user[0].send({
            content: help + lc, 
            fetchReply: true, 
            components: [OKbutton]
        }).catch(_err => isErr = true)];
        //私訊可行性檢查
        if(isErr) {
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給你。").catch(() => {});
        }
        //接收按鈕
        const msgfilter = async (i) => {
            await i.deferUpdate();
            return i.customId === 'OK'
        };
        let p1btn = await message[0].awaitMessageComponent({ filter: msgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 })
            .catch(() => {});
        if (!p1btn) {
            return mainMsg.edit({content: "由於太久沒有收到反映，因此取消向對方傳送邀請。", components: []}).catch(() => {});
        }
        message[0].edit({
            content: `已向 ${user[1]} (${user[1].tag}) 發送遊玩邀請，請稍後對方的回復...`, 
            components: []
        });
        mainMsg.edit("正在等待對方同意邀請...").catch(() => {});;
        
        message.push( await user[1].send({
            content: 
                `${user[0]} (${user[0].tag}) 從 **${interaction.guild.name}** 的 ${interaction.channel} 頻道，對你發出將棋(/shogi)的遊玩邀請。\n\n` + 
                help + `\n\n按下下面的按鈕可以開始進行遊戲。\n如果不想進行遊戲，請忽略本訊息。`, 
            components: [OKbutton]
        }).catch(_err => isErr = true));
        if(isErr) {
            message[0].edit("已取消遊戲，因為我無法傳送訊息給" + user[1] + " (" + user[1].tag + ")" + "。");
            return mainMsg.edit("已取消遊戲，因為我無法傳送訊息給" + user[1] + " (" + user[1].tag + ")" + "。").catch(() => {});
        }
        let p2btn = await message[1].awaitMessageComponent({ filter: msgfilter, componentType: Discord.ComponentType.Button, time: 5 * 60 * 1000 });
        if (!p2btn) {
            mainMsg.edit("對方並未對邀請做出回覆，因此取消開始遊戲。");
            message[0].edit("對方並未對邀請做出回覆，因此取消開始遊玩五子棋。");
            return p2btn.update(`剛剛 ${user[0]} (${user[0].tag}) 向你發送了五子棋(/gomoku)的遊玩邀請，但你並未回覆。`);
        }

        await mainMsg.edit("對方同意遊玩邀請了! 即將開始遊戲...").catch(() => {});

        let player = offensive <= 2 ? offensive : Math.floor(Math.random() * 2) + 1;
        let step = 0;
        /*
        await mainMsg.edit("測試結束").catch(() => {});
        message.forEach((msg, ind) => {
            msg.edit({
                content: 
                `測試結束`,
            components: []
            })
        })
        */
	},
};

class Shogi {
    /**
     * @type {{game: Array<Array<string>>,sente: Array<string>,gote: Array<string>}}
     */
    #board;
    //手番については、先手番ならb、後手番ならwと表記します。（Black、Whiteの頭文字）
    constructor() {
        this.#board.game = [];
        for(let i = 0; i < 9; i++) {
            this.#board.game.push(['0', '0', '0', '0', '0', '0', '0', '0', '0', ]);
        }
        this.#board.sente = [];
        this.#board.gote = [];
    }

    init() {
        this.#board.game = [
            ['l', 'n', 's', 'g', 'k', 'g', 's', 'n', 'l'],
            ['0', 'r', '0', '0', '0', '0', '0', 'b', '0'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['0', '0', '0', '0', '0', '0', '0', '0', '0'],
            ['0', '0', '0', '0', '0', '0', '0', '0', '0'],
            ['0', '0', '0', '0', '0', '0', '0', '0', '0'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['0', 'B', '0', '0', '0', '0', '0', 'R', '0'],
            ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'],
        ]
        this.#board.sente = [];
        this.#board.gote = [];
        /*
        先手の玉：K、後手の玉：k （Kingの頭文字）
        先手の飛車：R、後手の飛車：r （Rookの頭文字）
        先手の角：B、後手の角：b （Bishopの頭文字）
        先手の金：G、後手の金：g （Goldの頭文字）
        先手の銀：S、後手の銀：s （Silverの頭文字）
        先手の桂馬：N、後手の桂馬：n （kNightより）
        先手の香車：L、後手の香車：l （Lanceの頭文字）
        先手の歩：P、後手の歩：p （Pawnの頭文字）

        駒が成った状態を表記するには、駒の文字の前に+をつけます。先手のと金は+Pとなります。
        */
    }

    /**
     * 
     * @param {number} facing 設為0時代表先手在下方，設為1時先手在上方
     */
    board(facing) {
        let text = "";
        if(!facing) {
            this.#board.gote
            
        }
    }
}