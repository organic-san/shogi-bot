const Discord = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const simbol = ["☗", "☖"];

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
                { name: '發起遊戲的玩家', value: 0 },
                { name: '收到邀請的玩家', value: 1 },
                { name: '隨機決定', value: 2 },
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

        const inputRule = "下棋輸入說明：\n" + 
        "移動棋子時，請根據(旗子原本的位置)(旗子移動後的位置)(是否升變，未輸入則不升變)的方式輸入。\n" +
        "例如將棋子將從 `7七` 移動到 `7六`，請輸入 `7七7六` 或 `7776`。\n" +
        "需要升變的時候請在位置後加入 `+` 符號，例如將棋子從 `7四` 移動到 `7三` 並升變，請輸入 `7四7三+` 或 `7473+`。\n\n" +
        "打入手上持有的旗子時，請輸入要打入的棋子名稱與打入的位置。\n" +
        "打入的棋子名稱請輸入 `步`、`香`、`桂`、`銀`、`金`、`角`、`飛` 的其中一種，" +
        "或是輸入 `步兵`、`香車`、`桂馬`、`銀將`、`金將`、`角行`、`飛車` 的其中一種。\n" +
        "例如在 `3四` 打入一枚 `步`，請輸入 `步3四` 或 `步兵3四`。在 `7五` 打入一枚 `桂馬`，請輸入 `桂7五` 或 `桂馬7五`，這兩種都是合法輸入。\n"
        
        const help = 
            "將棋 - 遊戲說明: \n" + 
            "主要以捕獲對方玉將為原則。\n" + 
            "詳細說明請參照維基百科：<https://zh.wikipedia.org/wiki/%E6%97%A5%E6%9C%AC%E5%B0%86%E6%A3%8B>\n" +
            "為簡化規則，無法做出入玉宣言。\n\n" +
            inputRule + "(以上輸入方法在遊玩過程中也可以查看。)\n\n" +
            "每一步棋的時間限制是3分鐘，請在輪到自己後的3分鐘內完成操作。\n\n" +
            (offensive === 0 ? `${user[0]} (${user[0].tag}) 為先手。` : 
                (offensive === 1 ? `${user[1]} (${user[1].tag}) 為先手。` : "先後手將隨機決定。"));
            
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
            message[0].edit("對方並未對邀請做出回覆，因此取消開始遊玩將棋。");
            return p2btn.update(`剛剛 ${user[0]} (${user[0].tag}) 向你發送了將棋(/shogi)的遊玩邀請，但你並未回覆。`);
        }

        await mainMsg.edit("對方同意遊玩邀請了! 即將開始遊戲...").catch(() => {});

        /**
         * @type {number} 先手的玩家
         */
        const sente = offensive <= 1 ? offensive : Math.floor(Math.random() * 2);;
        /**
         * @type {number} 後手的玩家
         */
        const gote = (sente + 1) % 2;
        /**
         * @type {number} 當下的玩家
         */
        let player = sente;
        let step = 0;
        const board = new Shogi();
        board.init();
        let gameInfo = 
            `遊戲: 將棋\n` + 
            `先手${simbol[sente]}: ${user[sente]} (${user[sente].tag})\n` + 
            `後手${simbol[gote]}: ${user[gote]} (${user[gote].tag})\n`;
        let nowPlayer = 
            `目前操作玩家: ${user[sente]} (${user[sente].tag})\n`;
        const msgPlaying = "請輸入要下棋的位置。\n\n" + inputRule;
        //TODO: 在這裡說明下棋的方式
        const msgWaiting = "正在等待對方執行操作...";
        const timelimit = 3;
        let masu = "";

        message.forEach(async (msg, ind) => {
            msg.edit({
                content:
                    `${gameInfo}\n${nowPlayer}${ind == sente ? msgPlaying : msgWaiting}`,
                files: [await board.board(ind == sente, ind == sente)],
                components: []
            })
        })

        //TODO: 放棄按鈕與它的偵測，按下放棄按鈕視同按下方認輸

        let collector = [
            message[0].channel.createMessageCollector({time: (player === 1 ? timelimit : 999) * 60 * 1000 }),
            message[1].channel.createMessageCollector({time: (player === 2 ? timelimit : 999) * 60 * 1000 })
        ]
        mainMsg.edit("正在開始遊玩中...");
        
        collector.forEach(async (col, index) => {
            col.on("collect", async msg => {
                if(msg.author.id !== user[index].id) return;
                collector[index].resetTimer(timelimit * 60 * 1000);
                if(player !== (index))
                    return msg.reply({content: '現在是對方的回合喔。', allowedMentions: {repliedUser: false}});
                
                //判斷現在的玩家是否為先手
                const playerIsSente = (index === sente);

                //輸入資料的格式檢查
                if(!Shogi.inputCheck(msg.content)) 
                    return msg.reply({content: '位置資訊不符合格式或輸入的位置超過棋盤範圍，機器人無法解讀，請依照格式輸入。', allowedMentions: {repliedUser: false}});
                //輸入資料的統一化調整 & 消彌先後手盤面方向不同造成的輸入差異
                const input = Shogi.inputTranslate(msg.content, playerIsSente);
                const reason = board.checkLegitimacy(input, playerIsSente);
                if(reason !== true) return msg.reply({content: '輸入錯誤：' + reason + '\n請重新輸入。', allowedMentions: {repliedUser: false}});
                board.putKoma(input, playerIsSente);

                //TODO: 遊戲終止設定
                if(false) {
                    
                } else {
                    collector[(player + 1) % 2].resetTimer(timelimit * 60 * 1000);
                    collector[player].resetTimer(999 * 60 * 1000);
                    step++;
                    player = (player + 1) % 2;
                    const senteBoard = await board.board(true, player === sente);
                    const goteBoard = await board.board(false, player === gote);

                    nowPlayer = 
                        `目前操作玩家: ${user[player]} (${user[player].tag})\n`;
                    //masu = msg.content.slice(0, 1).toUpperCase() + msg.content.slice(1);
                    let kmsg = message[index];
                    message[index] = await user[index].send({
                        content:
                            `${gameInfo}\n${nowPlayer}${msgWaiting}`,
                        files: [index == sente ? senteBoard : goteBoard],
                        components: []
                    });
                    message[(index + 1) % 2].edit({
                        content:
                            `${gameInfo}\n${nowPlayer}${msgPlaying}`,
                        files: [(index + 1) % 2 == sente ? senteBoard : goteBoard],
                        components: []
                    });
                    await kmsg.delete();
                    mainMsg.edit({
                        content: `${gameInfo}\n${nowPlayer}"遊戲正在進行中..."`,
                        files: [senteBoard],
                        components: []
                    }).catch(() => {});
                }

                //TODO: 對執行結果做遊戲結束的檢定
                //TODO: 更新遊玩過程資料並傳送給玩家與主訊息，主訊息的圖片以先手方顯示的版本為主
            });
        });

        collector.forEach(async (col, index) => {
            col.on('end',async (c, r) => {
                if(r !== "messageDelete" && r !== "end"){
                    //TODO: 修改勝負判定讓超時的一方為敗者，另一方為勝者
                    const senteBoard = await board.board(true, 2);
                    const goteBoard = await board.board(false, 2);
                    message[index].edit({
                        content: 
                            `${gameInfo}\n\n` + 
                            `由於你太久沒有回應，因此結束了這場遊戲。`,
                        files: [index == sente ? senteBoard : goteBoard],
                        components: []
                    });
                    message[(index + 1) % 2].edit({
                        content: 
                            `${gameInfo}\n\n` + 
                            `由於對方太久沒有回應，因此結束了這場遊戲。`,
                            files: [(index + 1) % 2 == sente ? senteBoard : goteBoard],
                        components: []
                    });
                    mainMsg.edit({
                        content: 
                            `${gameInfo}\n` + 
                            "遊戲因為操作逾時而結束。",
                        files: [senteBoard],
                    }).catch(() => {});
                    collector[(index + 1) % 2].stop('end');
                }
            })
        })
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
     * @type {{game: Array<Array<string>>,senteKoma: Array<string>,goteKoma: Array<string>}}
     */
    #board;
    //手番については、先手番ならb、後手番ならwと表記します。（Black、Whiteの頭文字）
    constructor() {
        this.#board = {
            game: [],
            senteKoma: [],
            goteKoma: []
        }
        for(let i = 0; i < 9; i++) {
            this.#board.game.push(['0', '0', '0', '0', '0', '0', '0', '0', '0', ]);
        }
    }

    static get Space() {
        return "0";
    }

    static get King() {
        return "k";
    }

    static get Rook() {
        return "r";
    }

    static get RookPlus() {
        return "+r";
    }

    static get Bishop() {
        return "b";
    }

    static get BishopPlus() {
        return "+b";
    }

    static get Gold() {
        return "g";
    }

    static get Silver() {
        return "s";
    }

    static get SilverPlus() {
        return "+s";
    }

    static get Knight() {
        return "n";
    }

    static get KnightPlus() {
        return "+n";
    }

    static get Lance() {
        return "l";
    }

    static get LancePlus() {
        return "+l";
    }

    static get Pawn() {
        return "p";
    }

    static get PawnPlus() {
        return "+p";
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
        this.#board.senteKoma = [];
        this.#board.goteKoma = [];
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

            ['l', 'n', 's', 'g', 'k', 'g', 's', 'n', 'l'],
            ['0', 'r', '0', '0', '0', '0', '0', 'b', '0'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['0', '0', '0', '0', '0', '0', '0', '0', '0'],
            ['0', '0', '0', '0', '0', '0', '0', '0', '0'],
            ['0', '0', '0', '0', '0', '0', '0', '0', '0'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['0', 'B', '0', '0', '0', '0', '0', 'R', '0'],
            ['L', 'N', 'S', 'G', 'K', 'G', 'S', 'N', 'L'],
        */
    }

    /**
     * 
     * @param {boolean} isSente 設為true時代表回傳先手視角，否則回傳後手視角
     * @param {boolean} isPlayer 下棋方是否為下方玩家
     */
    async board(isSente, isPlayer) {
        const canvas = Canvas.createCanvas(2304, 2304);
		const context = canvas.getContext('2d');

        //座標指定
        const leftTopXY = {x: 330, y: 452};
        //(368, 490) 格子右上角 往左上推 ((220 - 145(格子大小)) / 2) 得到 (330, 452)
        const rightBottomXY = {x: 466, y: 344};
        const blockSize = 161;
        const imageSize = 220;

        const background = await Canvas.loadImage('./pic/shogi-board.png');
        context.drawImage(background, 0, 0, canvas.width, canvas.height);

        for(let i = 0; i < 9; i++) {
            for(let j = 0; j < 9; j++) {
                let koma; 
                //先後位置顛倒
                if(!isSente) koma = this.#board.game[8-i][8-j];
                else koma = this.#board.game[i][j];
                if(koma == "0") continue;
                //先後棋子朝向顛倒
                if(!isSente) {
                    if(koma == koma.toUpperCase()) koma = koma.toLowerCase();
                    else if(koma == koma.toLowerCase()) koma = koma.toUpperCase();
                }
                //放置棋子
                if(koma == koma.toUpperCase()) {
                    context.setTransform(1, 0, 0, 1, 0, 0);
                    context.translate(0, 0);
                    context.scale(1, 1);
                    const komaimg = await Canvas.loadImage(`./pic/shogi-${koma.toLowerCase()}.png`);
                    context.drawImage(komaimg, leftTopXY.x + blockSize * j, leftTopXY.y + blockSize * i, imageSize, imageSize);
                    
                } else {
                    context.setTransform(1, 0, 0, 1, 0, 0);
                    context.translate(canvas.width, canvas.height);
                    context.scale(-1, -1);
                    const komaimg = await Canvas.loadImage(`./pic/shogi-${koma.toLowerCase()}.png`);
                    context.drawImage(komaimg, rightBottomXY.x + blockSize * (8-j), rightBottomXY.y + blockSize * (8-i), imageSize, imageSize);
                }
            }
        }
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.translate(0, 0);
        context.scale(1, 1);
        const sente = await Canvas.loadImage('./pic/shogi-sente.png');
        const gote = await Canvas.loadImage('./pic/shogi-gote.png');
        const markSize = [500, 281];
        const markLeftDown = [50, 1981];
        const markRightTop = [1754, 43];
        if(isSente) {
            context.drawImage(sente, markLeftDown[0], markLeftDown[1], markSize[0], markSize[1]);
            context.drawImage(gote, markRightTop[0], markRightTop[1], markSize[0], markSize[1]);
        } else {
            context.drawImage(sente, markRightTop[0], markRightTop[1], markSize[0], markSize[1]);
            context.drawImage(gote, markLeftDown[0], markLeftDown[1], markSize[0], markSize[1]);
        }
        const playingMarkSize = 300
        const playingMarkLeftDown = [26, 1648];
        const playingMarkRightTop = [1978, 356];
        if(isPlayer !== 2) {
            const playerMark = await Canvas.loadImage(`./pic/shogi-player.png`);
            if(isPlayer) context.drawImage(playerMark, playingMarkLeftDown[0], playingMarkLeftDown[1], playingMarkSize, playingMarkSize);
            else context.drawImage(playerMark, playingMarkRightTop[0], playingMarkRightTop[1], playingMarkSize, playingMarkSize);
        }

        const rowMax = 18;
        const baseKomaPos = [500, 2121];
        const komaWid = 90;
        const komaHei = 105;

        for(let i = 0; i < (isSente ? this.#board.senteKoma.length : this.#board.goteKoma.length); i++) {
            const koma = await Canvas.loadImage(
                './pic/shogi-' + (isSente ? this.#board.senteKoma[i] : this.#board.goteKoma[i]).toLowerCase() + '.png'
            );
            context.drawImage(
                koma, 
                baseKomaPos[0] + (i % rowMax) * komaWid + komaWid / 2 * (Math.floor(i / rowMax)), 
                baseKomaPos[1] - (imageSize / 2) + komaHei * (Math.floor(i / rowMax)), 
                imageSize, imageSize);
        }
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.translate(canvas.width, canvas.height);
        context.scale(-1, -1);
        for(let i = 0; i < (isSente ? this.#board.goteKoma.length : this.#board.senteKoma.length); i++) {
            const koma = await Canvas.loadImage(
                './pic/shogi-' + (isSente ? this.#board.goteKoma[i] : this.#board.senteKoma[i]).toLowerCase() + '.png'
            );
            context.drawImage(
                koma, 
                baseKomaPos[0] + (i % rowMax) * komaWid + komaWid / 2 * (Math.floor(i / rowMax)), 
                baseKomaPos[1] - (imageSize / 2) + komaHei * (Math.floor(i / rowMax)), 
                imageSize, imageSize);
        }
        const attachment = new Discord.AttachmentBuilder(await canvas.encode('png'), { name: 'profile-image.png' });
        return attachment;
        /*
        if(!facing) {
            this.#board.gote
            
        }
        */
    }

    /**
     * 轉換符合輸入規則的文字成系統處理用的文字
     * @param {string} content 符合格式(1a2b、3c4d+、P*5e等格式)的字串
     * @param {boolean} isSente 是否先手，將影響判斷是哪一方的旗子。
     * @return {string | boolean} 符合規則時回傳true，否則回傳不符合規則的原因的字串。
     */
    checkLegitimacy(content, isSente) {
        //關於邊界範圍內的問題已經在輸入型態檢查那裏處理，不需要再額外判斷
        if(Number.isNaN(parseInt(content[0]))) {
            const koma = content[0].toLowerCase();
            const temochi = (isSente ? this.#board.senteKoma : this.#board.goteKoma);
            if(!temochi.includes(koma)) return "手上並沒有這枚棋子。";
            const input = [parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            const to = this.#board.game[input[2]][input[3]];
            if(to !== Shogi.Space) return "放置棋子的位置已經有其他棋子。";
            if((koma === Shogi.Pawn || koma === Shogi.Lance) && (isSente ? (input[0] < 1) : (input[0] >= 8)))
                return "放置在此位置會使棋子無法移動。";
            if((koma === Shogi.Knight) && (isSente ? (input[0] < 2) : (input[0] >= 7)))
                return "放置在此位置會使棋子無法移動。";
            if(koma === Shogi.Pawn)
                for(let i = 0; i < 9; i++){
                    if(isSente ? 
                        (this.#board.game[i][input[1]] === Shogi.Pawn.toUpperCase()) : 
                        (this.#board.game[i][input[1]] === Shogi.Pawn.toLowerCase())) {
                            return "無法在同一排裡面放上兩個以上的步兵。";
                    }
                }
            return true;
        } else {
            //旗子移動
            const input = [parseInt(content[1]) - 1, 9 - parseInt(content[0]), parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            const shouhen = content[4] === "+" ? true : false;
            const from = this.#board.game[input[0]][input[1]];
            const fromIsSente = (from === from.toUpperCase()) && (from !== Shogi.Space);
            const koma = from.toLowerCase();
            const to = this.#board.game[input[2]][input[3]];
            const toIsSente = (to === to.toUpperCase());
            if(from === Shogi.Space) return "移動起點不存在旗子。";
            if(isSente !== fromIsSente) return "移動起點的棋子是敵方棋子。";
            if((input[1] === input[3]) && (input[0] === input[2])) return "移動起點與移動目標相同。";
            if((isSente === toIsSente) && (to !== Shogi.Space)) return "移動目標中有我方棋子。";
            if(shouhen && !(isSente ? ((input[2] < 3) || input[0] < 3) : (input[2] >= 6) || input[0] >= 6)) 
                return "該移動目標沒辦法讓指定的棋子升變。";
            if(shouhen && 
                (koma === Shogi.King || koma === Shogi.PawnPlus || koma === Shogi.RookPlus || koma === Shogi.LancePlus ||
                koma === Shogi.BishopPlus || koma === Shogi.KnightPlus || koma === Shogi.SilverPlus || koma === Shogi.Gold ))
                return "指定的棋子(玉將、金將或成金)無法升變。";

            //檢驗移動的合理性
            if(koma === Shogi.Pawn){
                if(input[1] === input[3] && (isSente ? input[0] - input[2]  === 1 : input[0] - input[2] === -1)) {
                    if(!shouhen && (isSente ? (input[2] < 1) : (input[2] >= 8))) return "指定的棋子(步兵)在移動目標的位置時必須升變。";
                    return true;
                }
                return "指定的棋子(步兵)無法做出這樣的移動。";
            }
            if(koma === Shogi.Gold || koma === Shogi.PawnPlus || koma === Shogi.LancePlus || 
                koma === Shogi.KnightPlus || koma === Shogi.SilverPlus ){
                //垂直直線上下一格
                if(input[1] === input[3] && (input[0] - input[2]  === 1 || input[0] - input[2] === -1))
                    return true;
                //水平直線左右一格
                if(input[0] === input[2] && (input[1] - input[3]  === 1 || input[1] - input[3] === -1))
                    return true;
                //左上與右上兩格，根據是否先手決定方向
                if(input[1] - input[3]  === 1 || input[1] - input[3] === -1)
                    if(isSente ? (input[0] - input[2] === 1) : (input[0] - input[2] === -1))
                        return true;
                return "指定的棋子(金將或成金)無法做出這樣的移動。";
            }
            if(koma === Shogi.Silver){
                //左上左下右上右下共四格
                if((input[1] - input[3]  === 1 || input[1] - input[3] === -1))
                    if((input[0] - input[2]  === 1 || input[0] - input[2] === -1))
                        return true;
                //正前方一格，根據是否先手決定方向
                if(input[1] === input[3] && (isSente ? (input[0] - input[2] === 1) : (input[0] - input[2] === -1)))
                    return true;
                return "指定的棋子(銀將)無法做出這樣的移動。";
            }
            if(koma === Shogi.Knight){
                //對斜前方兩格檢查，根據是否先手決定方向
                if(input[1] - input[3]  === 1 || input[1] - input[3] === -1)
                    if(isSente ? (input[0] - input[2] === 2) : (input[0] - input[2] === -2)){
                        if(!shouhen && (isSente ? (input[2] < 2) : (input[2] >= 7))) return "指定的棋子(桂馬)在移動目標的位置時必須升變。";
                        return true;
                    }
                return "指定的棋子(桂馬)無法做出這樣的移動。";
            }
            if(koma === Shogi.Lance){
                //棋子前方連續空盤判定
                if(input[1] === input[3] && (isSente ? (input[0] > input[2]) : (input[0] < input[2]))) {
                    for(let i = Math.min(input[0], input[2]) + 1; i < Math.max(input[0], input[2]); i++) 
                        if(this.#board.game[i][input[1]] !== Shogi.Space) return"指定的棋子(香車)在移動起點與移動目標中有其他棋子。";
                    if(!shouhen && (isSente ? (input[2] < 1) : (input[2] >= 8))) return "指定的棋子(香車)在移動目標的位置時必須升變。";
                    return true;
                }
                return "指定的棋子(香車)無法做出這樣的移動。";
            }
            if(koma === Shogi.Rook){
                //棋子前後連續空盤判定
                if(input[1] === input[3]) {
                    for(let i = Math.min(input[0], input[2]) + 1; i < Math.max(input[0], input[2]); i++) 
                        if(this.#board.game[i][input[1]] !== Shogi.Space) return"指定的棋子(飛車)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                //棋子左右連續空盤判定
                if(input[0] === input[2]) {
                    for(let i = Math.min(input[1], input[3]) + 1; i < Math.max(input[1], input[3]); i++) 
                        if(this.#board.game[input[0]][i] !== Shogi.Space) return"指定的棋子(飛車)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                return "指定的棋子(飛車)無法做出這樣的移動。";
            }
            if(koma === Shogi.Bishop){
                //棋子正向斜連續空盤判定
                if((input[1] - input[3]) === (input[0] - input[2])) {
                    for(let i = Math.min(input[0], input[2]) + 1, j = Math.min(input[1], input[3]) + 1;
                         i < Math.max(input[0], input[2]); 
                         i++, j++) 
                        if(this.#board.game[i][j] !== Shogi.Space) return"指定的棋子(角行)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                //棋子逆向斜連續空盤判定
                if((input[3] - input[1]) === (input[0] - input[2])) {
                    for(let i = Math.min(input[0], input[2]) + 1, j = Math.max(input[1], input[3]) - 1;
                         i < Math.max(input[0], input[2]); 
                         i++, j--) 
                        if(this.#board.game[i][j] !== Shogi.Space) return"指定的棋子(角行)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                return "指定的棋子(角行)無法做出這樣的移動。";
            }
            if(koma === Shogi.RookPlus){
                //棋子前後連續空盤判定
                if(input[1] === input[3]) {
                    for(let i = Math.min(input[0], input[2]) + 1; i < Math.max(input[0], input[2]); i++) 
                        if(this.#board.game[i][input[1]] !== Shogi.Space) return"指定的棋子(龍王)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                //棋子左右連續空盤判定
                if(input[0] === input[2]) {
                    for(let i = Math.min(input[1], input[3]) + 1; i < Math.max(input[1], input[3]); i++) 
                        if(this.#board.game[input[0]][i] !== Shogi.Space) return"指定的棋子(龍王)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                //左上左下右上右下共四格
                if((input[1] - input[3]  === 1 || input[1] - input[3] === -1))
                    if((input[0] - input[2]  === 1 || input[0] - input[2] === -1))
                        return true;
                return "指定的棋子(龍王)無法做出這樣的移動。";
            }
            if(koma === Shogi.BishopPlus){
                //棋子正向斜連續空盤判定
                if((input[1] - input[3]) === (input[0] - input[2])) {
                    for(let i = Math.min(input[0], input[2]) + 1, j = Math.min(input[1], input[3]) + 1;
                         i < Math.max(input[0], input[2]); 
                         i++, j++) 
                        if(this.#board.game[i][j] !== Shogi.Space) return"指定的棋子(龍馬)在移動起點與移動目標中有其他棋子。";
                    return true;
                }
                //棋子逆向斜連續空盤判定
                if((input[3] - input[1]) === (input[0] - input[2])) {
                    for(let i = Math.min(input[0], input[2]) + 1, j = Math.max(input[1], input[3]) - 1;
                         i < Math.max(input[0], input[2]); 
                         i++, j--) {
                            if(this.#board.game[i][j] !== Shogi.Space) return"指定的棋子(龍馬)在移動起點與移動目標中有其他棋子。";
                         }
                    return true;
                }
                //八方八格
                if((input[1] - input[3]  <= 1 && input[1] - input[3] >= -1))
                    if((input[0] - input[2]  <= 1 && input[0] - input[2] >= -1))
                        return true;
                return "指定的棋子(龍馬)無法做出這樣的移動。";
            }
            if(koma === Shogi.King){
                //八方八格
                if((input[1] - input[3]  <= 1 && input[1] - input[3] >= -1))
                    if((input[0] - input[2]  <= 1 && input[0] - input[2] >= -1))
                        return true;
                return "指定的棋子(玉將)無法做出這樣的移動。";
            }
        }
    }

    /**
     * 轉換符合輸入規則的文字成系統處理用的文字
     * @param {string} content 符合格式(1122、3344+、P*55等格式)的字串
     * @param {boolean} isSente 是否先手，將影響判斷是哪一方的旗子。
     */
    putKoma(content, isSente) {
        if(Number.isNaN(parseInt(content[0]))) {
            const input = [parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            if(isSente) {
                this.#board.senteKoma.splice(this.#board.senteKoma.findIndex(val => val === content[0].toLowerCase()), 1);
                this.#board.game[input[0]][input[1]] = content[0].toUpperCase();
            } else {
                this.#board.goteKoma.splice(this.#board.goteKoma.findIndex(val => val === content[0].toLowerCase()), 1);
                this.#board.game[input[0]][input[1]] = content[0].toLowerCase();
            }
        } else {
            const input = [parseInt(content[1]) - 1, 9 - parseInt(content[0]), parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            if(this.#board.game[input[2]][input[3]] !== Shogi.Space) {
                let t = "";
                if(this.#board.game[input[2]][input[3]].length === 2) t = this.#board.game[input[2]][input[3]][1];
                else t = this.#board.game[input[2]][input[3]][0];
                t = t.toLowerCase();
                if(isSente) {
                    this.#board.senteKoma.push(t);
                    this.#board.senteKoma = Shogi.komaSort(this.#board.senteKoma);
                } else {
                    this.#board.goteKoma.push(t);
                    this.#board.goteKoma = Shogi.komaSort(this.#board.goteKoma);
                }
            }
            if(content.length === 5) {
                this.#board.game[input[2]][input[3]] = "+" + this.#board.game[input[0]][input[1]];
            } else {
                this.#board.game[input[2]][input[3]] = this.#board.game[input[0]][input[1]];
            }
            this.#board.game[input[0]][input[1]] = Shogi.Space;
        }
    }

    /**
     * 較驗輸入是否符合本系統的要求
     * @param {string} content 要較驗的字串
     * @return {boolean} 是否符合要求
     */
    static inputCheck(content) {
        if(Number.isNaN(parseInt(content[0]))) {
            if(content.length < 3 && content.length > 4) return false;
            if(content.length === 3) {
                if(!KomaNameLegitimate.get(content[0])) return false;
                if(parseInt(content[1]) < 1 || parseInt(content[1]) > 9) return false;
                if(!kanjiToNumber.get(content[2])) return false;
                return true;
            } else {
                if(!KomaNameLegitimate.get(content[0] + content[1])) return false;
                if(parseInt(content[2]) < 1 || parseInt(content[2]) > 9) return false;
                if(!kanjiToNumber.get(content[3])) return false;
                return true;
            }
        } else {
            if(content.length < 4 && content.length > 5) return false;
            if(parseInt(content[0]) < 1 || parseInt(content[0]) > 9) return false;
            if(parseInt(content[2]) < 1 || parseInt(content[4]) > 9) return false;
            if(!kanjiToNumber.get(content[1])) return false;
            if(!kanjiToNumber.get(content[3])) return false;
            if(content.length === 5) if(content[4] !== "+") return false;
            return true;
        }
    }

    /**
     * 轉換符合輸入規則的文字成系統處理用的文字
     * @param {string} content 要轉換的字串
     * @param {string} isSente 是否先手，若非先手將進行棋盤位置顛倒的處理
     * @return {string} 轉換後的文字
     */
    static inputTranslate(content, isSente) {
        let returnVal = "";
        //將文字輸入(1四2五)轉換成數字模式(1425)
        //將文字輸入(桂2五)轉換成數字模式(N*25)
        if(Number.isNaN(parseInt(content[0]))) {
            if(content.length === 3) {
                returnVal = KomaNameLegitimate.get(content[0]);
                returnVal += ("*" + content[1] + kanjiToNumber.get(content[2]));
            } else {
                returnVal = KomaNameLegitimate.get(content[0] + content[1]);
                returnVal += ("*" + content[2] + kanjiToNumber.get(content[3]));
            }
        } else {
            returnVal = (content[0] + kanjiToNumber.get(content[1]) + content[2] + kanjiToNumber.get(content[3]));
            if(content.length === 5) returnVal += content[4];
        }

        returnVal = returnVal.split('');
        //消彌先後手的盤面會顛倒造成的輸入不相同
        if(!isSente) {
            if(!Number.isNaN(parseInt(content[0]))) {
                returnVal[0] = (10 - parseInt(returnVal[0])).toString();
                returnVal[1] = (10 - parseInt(returnVal[1])).toString();
            }
            returnVal[2] = (10 - parseInt(returnVal[2])).toString();
            returnVal[3] = (10 - parseInt(returnVal[3])).toString();
        }
        return returnVal.join('');
    }

    /**
     * 
     * @param {Array<string>} arr 
     */
    static komaSort(arr) {
        return arr.sort((a, b) => (KomaToSortNumber.get(a) - KomaToSortNumber.get(b)));
    }
}

const kanjiToNumber = new Map([
    ['一', '1'], ['1', '1'],
    ['二', '2'], ['2', '2'],
    ['三', '3'], ['3', '3'],
    ['四', '4'], ['4', '4'],
    ['五', '5'], ['5', '5'],
    ['六', '6'], ['6', '6'],
    ['七', '7'], ['7', '7'],
    ['八', '8'], ['8', '8'],
    ['九', '9'], ['9', '9'],
]);

const KomaNameLegitimate = new Map([
    ['步', 'P'], ['步兵', 'P'],
    ['香', 'L'], ['香車', 'L'],
    ['桂', 'N'], ['桂馬', 'N'],
    ['銀', 'S'], ['銀將', 'S'],
    ['金', 'G'], ['金將', 'G'],
    ['角', 'B'], ['角行', 'B'],
    ['飛', 'R'], ['飛車', 'R'],
]);

const KomaToSortNumber = new Map([
    ['p', '7'], 
    ['l', '6'],
    ['n', '5'],
    ['s', '4'],
    ['g', '3'],
    ['b', '2'],
    ['r', '1'],
]);