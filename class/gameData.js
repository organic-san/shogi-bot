class GameData {
    playerSente;
    playerGote;
    time; //s
    #gameRecord;
    #startState;
    #senteKoma;
    #goteKoma;

    /**
     * 
     * @param {string} playerSente 先手玩家名稱或ID
     * @param {string} playerGote 後手玩家名稱或ID
     * @param {Array<Array<string>>} startState 初始盤面
     */
    constructor(playerSente, playerGote, time,  startState) {
        this.playerGote = playerGote ?? "";
        this.playerSente = playerSente ?? "";
        this.time = time ?? "0";
        this.#gameRecord = [];
        this.#startState = startState ?? GameData.initState;
        this.#senteKoma = [];
        this.#goteKoma = [];
    }

    static get initState() {
        return [
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
    }

    get steps() {
        return this.#gameRecord.length;
    }

    static get Space() {
        return "0";
    }

    /**
     * 
     * @param {string} step 位置指定格式字串 ex: 7776、3332+、N*12 
     */
    addStep(step) {
        this.#gameRecord.push(step);
    }

    toJSON() {
        return {
            "playerSente": this.playerSente,
            "playerGote": this.playerGote,
            "startState": this.#startState,
            "gameRecord": this.#gameRecord,
            "time": this.time,
        }
    }

    toData(obj) { 
        this.playerSente = obj.playerSente;
        this.playerGote = obj.playerGote;
        obj.gameRecord.forEach(v => this.#gameRecord.push(v));
        obj.startState.forEach(v => this.#startState.push(v));
        this.time = obj.time;
    }

    runOneStep(steps) {
        //TODO: 旗子分辨、"同"分辨、不成分辨，詳情看棋譜說明
        const content = this.#gameRecord[steps];
        let word = "";
        if(Number.isNaN(parseInt(content[0]))) {
            word += (content[2] + GameData.#numToKanji(content[3]) + GameData.#engToKoma(content[0].toUpperCase()) + "打");
        } else {
            const input = [parseInt(content[1]) - 1, 9 - parseInt(content[0]), parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            word += (content[2] + GameData.#numToKanji(content[3]) + GameData.#engToKoma(this.#startState[input[0]][input[1]].toUpperCase()));
            if(content.length === 5)
                word += "成";
        }
        this.#putKoma(steps);
        return word;
    }

    static #numToKanji(n) {
        const numToKanji = new Map([
            ['1', '一'],
            ['2', '二'],
            ['3', '三'],
            ['4', '四'],
            ['5', '五'],
            ['6', '六'],
            ['7', '七'],
            ['8', '八'],
            ['9', '九'],
        ]);
        return numToKanji.get(n);
    }

    static #engToKoma(n) {
        const numToKanji = new Map([
            ['P', '步'],
            ['L', '香'],
            ['N', '桂'],
            ['S', '銀'],
            ['G', '金'],
            ['B', '角'],
            ['R', '飛'],
            ['+P', 'と'],
            ['+L', '成香'],
            ['+N', '成桂'],
            ['+S', '成銀'],
            ['+B', '龍'],
            ['+R', '馬'],
        ]);
        return numToKanji.get(n);
    }

    #putKoma(steps) {
        const content = this.#gameRecord[steps];
        const isSente = (steps + 1) % 2;
        if(Number.isNaN(parseInt(content[0]))) {
            const input = [parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            if(isSente) {
                this.#senteKoma.splice(this.#senteKoma.findIndex((val) => val === content[0].toLowerCase()), 1);
                this.#startState[input[0]][input[1]] = content[0].toUpperCase();
            } else {
                this.#goteKoma.splice(this.#goteKoma.findIndex((val) => val === content[0].toLowerCase()), 1);
                this.#startState[input[0]][input[1]] = content[0].toLowerCase();
            }
        } else {
            const input = [parseInt(content[1]) - 1, 9 - parseInt(content[0]), parseInt(content[3]) - 1, 9 - parseInt(content[2])];
            if(this.#startState[input[2]][input[3]] !== GameData.Space) {

                let t = "";
                if(this.#startState[input[2]][input[3]].length === 2) t = this.#startState[input[2]][input[3]][1];
                else t = this.#startState[input[2]][input[3]][0];
                t = t.toLowerCase();
                if(isSente) {
                    this.#senteKoma.push(t);
                } else {
                    this.#goteKoma.push(t);
                }
            }
            if(content.length === 5) {
                this.#startState[input[2]][input[3]] = "+" + this.#startState[input[0]][input[1]];
            } else {
                this.#startState[input[2]][input[3]] = this.#startState[input[0]][input[1]];
            }
            this.#startState[input[0]][input[1]] = GameData.Space;
        }
        //TODO: 回傳這一步下了什麼棋
    }
}

module.exports.GameData = GameData;