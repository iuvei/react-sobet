import {
    observe,
    observable,
    action,
    runInAction,
    computed
} from 'mobx';
import lotteryTypeConfig from '../views/common/lottery/lotteryTypeConfig';
import lotteryCodeToCn from '../views/common/lottery/lotteryCodeToCn';
import trendConfig from '../views/common/lottery/trend/trendConfig';
import playWayToCn from '../views/common/lottery/playWayToCn';
import plateConfig from '../views/common/lottery/plate/plateConfig';
import {
    queryTrendData,
    updateIssue,
    getLotteryTabConfig,
    submitOrder,
    getRecord,
    getOddsByLt
} from '../utils/ajax';
import timeSleep from '../utils/timeSleep';
import formatTime from '../utils/formatTime';
import { combination, intersection, difference, calcHzCount, calcZuxHzCount, calcKuaduCount, noRepeatMul } from '../utils/calcBetCount';
import { choose, computeByMargin } from '../utils/algorithm';

class LotteryStore {

    disposer = observe(this, 'lotteryCode', (change) => {
        const {
            newValue,
            oldValue
        } = change;
        if (newValue !== oldValue) {
            this.updateIssue();
            this.emptyOpencode = true;//开奖号码处空白
            this.queryTrendData();
            this.getRecord();
            this.getTabConfig();
            this.orderData = [];
            this.showTraceFlag = false;
            this.setTraceSelectedRowKeys([]);
        }
    })

    @observable emptyOpencode = true

    playWayToCn = playWayToCn

    lotteryTypeConfig = lotteryTypeConfig

    lotteryCodeToCn = lotteryCodeToCn

    trendConfig = trendConfig

    @computed get lotteryType() {
        return this.lotteryTypeConfig[this.lotteryCode];
    }

    @computed get showRaceTabFlag() {
        return this.lotteryType === 'pk10';
    }

    @observable showRaceFlag = Boolean(localStorage.getItem('showRaceFlag')) || true

    @computed get raceTabText() {
        if (this.showRaceFlag) {
            return '隐藏动画';
        } else {
            return '打开动画';
        }
    }

    @observable lotteryCode = localStorage.getItem('lotteryCode') || 'cqssc' //彩种codeCQSSC

    @action setLotteryCode = (value) => {
        this.lotteryCode = value;
        localStorage.setItem('lotteryCode', value);
    }

    @action linkToLottery = (lotteryCode, history, path) => {
        this.setLotteryCode(lotteryCode);
        if (history.location.pathname.startsWith(path)) {
            return;
        }
        history.push(path);
    }

    @observable oddsData = {}

    @action
    getOddsData = async () => {
        const res = await getOddsByLt({ lottery: this.lotteryCode.toLocaleUpperCase() });
        if (res.data.code === 1) {
            this.oddsData = res.data.result[this.lotteryCode.toLocaleUpperCase()];
            if (this.chaidanConfig.chaidan) {
                this.changeCurrentChaidanOdd('');
            } else {
                this.changeCurrentOdd(`${this.oddsData[this.method]['bonusA']}~${this.oddsData[this.method]['rateA']}`);
            }
        }
    }

    @observable currentOdd = '';

    @observable currentChaidanOdd = '';

    @observable currentChaidanOddArr = [];

    @action
    changeCurrentOdd = (value) => {
        this.currentOdd = value;
    }

    @action
    changeCurrentChaidanOdd = (value) => {
        this.currentChaidanOdd = value;
    }

    @computed get currentChaidanOddArrMinMax() {
        const result = [];
        const arr = this.currentChaidanOddArr;
        if (arr.length === 0) {
            return [];
        }
        const rateA = arr[0]['rateA'];
        if (typeof rateA !== undefined && typeof rateA !== null) {
            const As = arr.map(({ bonusA }) => bonusA);
            const maxBonusA = Math.max(...As);
            const minBonusA = Math.min(...As);
            result.push({
                type: 'A',
                arr: arr.map(({ key, bonusA, rateA }) => ({
                    key,
                    odds: bonusA,
                    point: rateA
                })),
                val: `${minBonusA}-${maxBonusA}~${rateA * 100}%`
            });
        }
        const rateB = arr[0]['rateB'];
        if (typeof rateB !== undefined && typeof rateB !== null) {
            const Bs = arr.map(({ bonusB }) => bonusB);
            const maxBonusB = Math.max(...Bs);
            const minBonusB = Math.min(...Bs);
            result.push({
                type: 'B',
                arr: arr.map(({ key, bonusB, rateB }) => ({
                    key,
                    odds: bonusB,
                    point: rateB
                })),
                val: `${minBonusB}-${maxBonusB}~${rateB * 100}%`
            });
        }
        return result;
    }

    /* @action setCurrentChaidanOddArrMinMax(arr) {
        const result = [];
        const rateA = arr[0]['rateA'];
        if (rateA) {
            const As = arr.map(({ bonusA }) => bonusA);
            const maxBonusA = Math.max(...As);
            const minBonusA = Math.min(...As);
            result.push(`${minBonusA}-${maxBonusA}-${rateA * 100}%`);
        }
        const rateB = arr[0]['rateB'];
        if (rateB) {
            const Bs = arr.map(({ bonusB }) => bonusB);
            const maxBonusB = Math.max(...Bs);
            const minBonusB = Math.min(...Bs);
            result.push(`${minBonusB}-${maxBonusB}-${rateB * 100}%`);
        }
        return result;
    } */

    @observable currentIssue = ''

    @computed get openIssue() {
        return this.trendData[0] && this.trendData[0]['issueNo'];
    }

    @computed get opencodeArr() {
        if (this.trendData[0]) {
            return this.trendData[0]['code'].split(',');
        }
        return [];
    }

    @observable countdown = Date.now() //倒计时秒数

    @action updateIssue = async () => {
        await timeSleep(2000);
        const res = await updateIssue({
            lottery: this.lotteryCode.toLocaleUpperCase()
        });
        runInAction(() => {
            if (res.data.code === 1) {
                const {
                    second,
                    issue,
                    nextApp
                } = res.data.result;
                if (second < 0) {
                    this.countdown = '等待开售';
                } else {
                    this.countdown = Date.now() + second * 1000;
                }
                this.currentIssue = issue;
                this.nextApp = nextApp;
                if (this.showTraceFlag) {
                    this.initTraceData();//更新追号信息
                    if (this.traceSelectedRowKeys.length > 0) {
                        this.setTraceSelectedRowKeys(this.traceData.slice(0, Number(this.traceCount || this.defaultTraceCount)).map(v => v.issue.detail));
                        this.genTraceData();
                    }
                }
            }
        });
    }

    @computed get lotteryCn() { //彩种  重庆时时彩
        return this.lotteryCodeToCn[this.lotteryCode];
    }


    @observable trendData = []

    @observable hitFrequency = []

    @observable skipFrequency = []

    @action queryTrendData = async () => {
        const res = await queryTrendData({
            size: 30,
            lottery: this.lotteryCode.toLocaleUpperCase(),
            method: this.method
        });

        if (res.data.code === 1) {
            this.emptyOpencode = false;//显示开奖号码
            this.trendData = res.data.result.issue;
            this.hitFrequency = res.data.result.hitFrequency;
            this.skipFrequency = res.data.result.skipFrequency;
        }
    }

    @observable tabConfig = []

    @action getTabConfig = async () => {
        const res = await getLotteryTabConfig({ lottery: this.lotteryCode });
        if (res.data.code === 1) {
            this.tabConfig = res.data.result;
            this.setActiveTab(JSON.parse(localStorage.getItem(`${this.lotteryCode}-${this.tabType}-activeTab`)) || this.currentTabConfig[0]);
        }
    }

    @computed get normalTabConfig() {
        return this.tabConfig.filter(({ type }) => type === 'normal');
    }

    @computed get unlimitedTabConfig() {
        return this.tabConfig.filter(({ type }) => type === 'unlimited');
    }

    @computed get unlimitedFlag() {
        return this.unlimitedTabConfig.length > 0;
    }

    @observable tabType = localStorage.getItem(`${this.lotteryCode}-tabType`) || 'normal'

    @computed get currentTabConfig() {
        if (this.unlimitedFlag) {
            if (this.tabType === 'normal') {
                return this.normalTabConfig;
            }
            if (this.tabType === 'unlimited') {
                return this.unlimitedTabConfig;
            }
        }
        return this.normalTabConfig;
    }

    @action switchMoreTab = () => {
        if (this.tabType === 'normal') {
            this.tabType = 'unlimited';
            this.setActiveTab(JSON.parse(localStorage.getItem(`${this.lotteryCode}-unlimited-activeTab`)) || this.unlimitedTabConfig[0]);
        } else {
            this.tabType = 'normal';
            this.setActiveTab(JSON.parse(localStorage.getItem(`${this.lotteryCode}-normal-activeTab`)) || this.normalTabConfig[0]);
        }
        localStorage.setItem(`${this.lotteryCode}-tabType`, this.tabType);
    }

    @action switchRaceTab = () => {
        this.showRaceFlag = !this.showRaceFlag;
        if (this.showRaceFlag) {
            localStorage.setItem(`${this.lotteryCode}-showRaceFlag`, 1);
        } else {
            localStorage.removeItem(`${this.lotteryCode}-showRaceFlag`);
        }
    }

    plateConfig = plateConfig

    @observable activeTab = JSON.parse(localStorage.getItem(`${this.lotteryCode}-${this.tabType}-activeTab`)) || this.currentTabConfig[0];

    @action
    setActiveTab = (obj) => {
        this.activeTab = obj;
        this.setMethod(localStorage.getItem(`${this.lotteryCode}-${this.activeTab.tab}-method`) || this.activeTab['subTabConfig'][0]['playWay'][0]['en']);
        localStorage.setItem(`${this.lotteryCode}-${this.tabType}-activeTab`, JSON.stringify(obj));
    }

    @observable method = localStorage.getItem(`${this.lotteryCode}-${this.activeTab && this.activeTab.tab}-method`) || (this.activeTab && this.activeTab['subTabConfig'][0]['playWay'][0]['en']) //玩法wx_zx_fs

    @action setMethod = (value) => {
        this.method = value;
        localStorage.setItem(`${this.lotteryCode}-${this.activeTab.tab}-method`, value);
        this.resetPlate();
        this.setTrendListHeight();
    }

    @action resetPlate = () => {
        this.selectedNums = {};
        this.selectedChaidanNums = [];
        this.inputedNums = [];
        this.rxPosValues = this.plateConfig[this.lotteryCode][this.method]['posSelect'];
    }

    @computed get chaidanConfig() {
        const activeSubItem = this.activeTab['subTabConfig'].find(subObj => subObj.playWay.some(({ en }) => en === this.method));
        const result = activeSubItem.playWay.find(({ en }) => en === this.method);
        return result;
    }

    @observable missShowFlag = localStorage.getItem('missShowFlag')

    @observable hotShowFlag = localStorage.getItem('hotShowFlag')

    @action switchMiss = (bool) => {
        this.missShowFlag = bool;
        if (bool) {
            localStorage.setItem('missShowFlag', 1);
        } else {
            localStorage.removeItem('missShowFlag');
        }
    }

    @action switchHot = (bool) => {
        this.hotShowFlag = bool;
        if (bool) {
            localStorage.setItem('hotShowFlag', 1);
        } else {
            localStorage.removeItem('hotShowFlag');
        }
    }

    @observable rxPosValues = [];

    @action posSelectChange = (posValues) => {
        this.rxPosValues = posValues;
    }

    @observable selectedNums = {}

    @action selectNum = (pos, index, num, posArr) => {
        if (pos === '所有位置') {//定位胆的所有位置
            this.selectedNums[index] = this.selectedNums[index] || [];
            const INDEX = this.selectedNums[index].findIndex(v => v === num);
            if (INDEX === -1) {
                this.selectedNums[index].push(num);
                posArr.forEach((p, idx) => {
                    this.selectedNums[idx] = this.selectedNums[idx] || [];
                    !this.selectedNums[idx].includes(num) && this.selectedNums[idx].push(num);
                });
            } else {
                this.selectedNums[index].splice(INDEX, 1);
                posArr.forEach((p, idx) => {
                    this.selectedNums[idx] = this.selectedNums[idx] || [];
                    const IDX = this.selectedNums[idx].findIndex(v => v === num);
                    if (IDX !== -1) {
                        this.selectedNums[idx].splice(IDX, 1);
                    }
                });
            }
            this.selectedNums = { ...this.selectedNums };
            return;
        }
        if (this.mathConfig['type'] === '11x5rxdt') {//11选5的胆拖玩法，点击规则不一样
            const { z } = this.mathConfig;//z为胆码不能超过的个数
            this.selectedNums[0] = this.selectedNums[0] || [];
            this.selectedNums[1] = this.selectedNums[1] || [];
            if (pos === '胆码') {
                const INDEX = this.selectedNums[0].findIndex(v => v === num);

                if (INDEX === -1) {
                    this.selectedNums[0].push(num);
                    if (this.selectedNums[0].length >= z) {
                        this.selectedNums[0].shift();
                    }
                } else {
                    this.selectedNums[0].splice(INDEX, 1);
                }

                const dumpIndex = this.selectedNums[1].findIndex(v => v === num);
                if (dumpIndex !== -1) {
                    this.selectedNums[1].splice(dumpIndex, 1);
                }
            }
            if (pos === '拖码') {
                const INDEX = this.selectedNums[1].findIndex(v => v === num);

                if (INDEX === -1) {
                    this.selectedNums[1].push(num);
                } else {
                    this.selectedNums[1].splice(INDEX, 1);
                }

                const dumpIndex = this.selectedNums[0].findIndex(v => v === num);
                if (dumpIndex !== -1) {
                    this.selectedNums[0].splice(dumpIndex, 1);
                }
            }
            this.selectedNums = { ...this.selectedNums };
            return;
        }
        if (this.mathConfig['type'] === 'baodan') {//奇葩的包胆玩法，点击规则不一样
            this.selectedNums[index] = this.selectedNums[index] || [];
            const INDEX = this.selectedNums[index].findIndex(v => v === num);
            if (INDEX === -1) {
                this.selectedNums[index] = [];
                this.selectedNums[index].push(num);
            } else {
                this.selectedNums[index].splice(INDEX, 1);
            }
            this.selectedNums = { ...this.selectedNums };
            return;
        }
        this.selectedNums[index] = this.selectedNums[index] || [];
        const INDEX = this.selectedNums[index].findIndex(v => v === num);
        if (INDEX === -1) {
            this.selectedNums[index].push(num);
        } else {
            this.selectedNums[index].splice(INDEX, 1);
        }
        this.selectedNums = { ...this.selectedNums };
    }

    @action filterNum = (pos, index, value, numArr) => {
        const DaxiaoFlag = (Number(numArr[0]) + Number(numArr[numArr.length - 1])) / 2;
        switch (value) {
            case '全':
                this.selectedNums[index] = numArr;
                break;
            case '大':
                this.selectedNums[index] = numArr.filter(v => Number(v) > DaxiaoFlag);
                break;
            case '小':
                this.selectedNums[index] = numArr.filter(v => Number(v) <= DaxiaoFlag);
                break;
            case '奇':
                this.selectedNums[index] = numArr.filter(v => Number(v) % 2 !== 0);
                break;
            case '偶':
                this.selectedNums[index] = numArr.filter(v => Number(v) % 2 === 0);
                break;
            case '清':
                this.selectedNums[index] = [];
                break;
        }
        this.selectedNums = { ...this.selectedNums };
    }

    @observable selectedChaidanNums = [];

    @action selectChaidanNum = ({ en, cn }) => {
        const INDEX = this.selectedChaidanNums.findIndex(v => v.cn === cn);
        if (INDEX === -1) {
            this.selectedChaidanNums.push({ en, cn });
            this.currentChaidanOddArr.push({
                key: en,
                bonusA: this.oddsData[en]['bonusA'],
                rateA: this.oddsData[en]['rateA'],
                bonusB: this.oddsData[en]['bonusB'],
                rateB: this.oddsData[en]['rateB'],
            });
        } else {
            this.selectedChaidanNums.splice(INDEX, 1);
            this.currentChaidanOddArr.splice(INDEX, 1);
        }
        console.log(this.currentChaidanOddArr)
        this.changeCurrentChaidanOdd(this.currentChaidanOdd || 'A');
    }

    @action filterChaidanNum = (value, numArr) => {
        switch (value) {
            case '全':
                this.selectedChaidanNums = numArr;
                break;
            case '清':
                this.selectedChaidanNums = [];
                break;
        }
    }

    @computed get plateType() {
        return this.plateConfig[this.lotteryCode][this.method] && this.plateConfig[this.lotteryCode][this.method]['plate']['type'];
    }

    @computed get mathConfig() {
        return this.plateConfig[this.lotteryCode][this.method] && this.plateConfig[this.lotteryCode][this.method]['mathConfig'];
    }

    @computed get betCount() {
        if (!this.mathConfig) {
            return 0;
        }
        if (this.chaidanConfig['chaidan']) {
            if (this.mathConfig['type'] === 'leijia') {
                return this.selectedChaidanNums.length;
            }
            return 0;
        }
        if (this.plateType === 'click') {
            if (this.mathConfig['type'] === 'leijia') {
                const { r, needMultiplyPos } = this.mathConfig;
                let values = Object.values(this.selectedNums);
                values = values.map(a => a.slice());//mobx数组转js数组
                if (needMultiplyPos) {
                    return combination(this.rxPosValues.length, r) * values.reduce((a, b) => a + b.length, 0);
                }
                return values.reduce((a, b) => a + b.length, 0);
            }
            if (this.mathConfig['type'] === 'jiecheng') {
                const { posCount } = this.mathConfig;
                const keys = Object.keys(this.selectedNums);
                let values = Object.values(this.selectedNums);
                values = values.map(a => a.slice());//mobx数组转js数组
                if (keys.length < posCount) {//位置没选满，为0
                    return 0;
                } else {
                    return values.reduce((a, b) => a * b.length, 1);
                }
            }
            if (this.mathConfig['type'] === 'zuhe') {
                const { per, n, r, needMultiplyPos } = this.mathConfig;
                const m = (this.selectedNums[0] || []).length;
                if (needMultiplyPos) {
                    return combination(this.rxPosValues.length, r) * combination(m, n) * per;
                }
                return combination(m, n) * per;
            }
            if (this.mathConfig['type'] === 'zucheng') {
                const { up, down, r, needMultiplyPos } = this.mathConfig;
                const upNums = this.selectedNums[0] || [];
                const downNums = this.selectedNums[1] || [];
                const calcZucheng = (a, b, c) => {
                    const n1 = combination(b.length, c);
                    const n2 = difference(a, b).length;
                    const n3 = intersection(a, b).length;
                    const n4 = combination(b.length - 1, c) * n3;
                    return n1 * n2 + n4;
                };
                let result;
                if (up === 1) {
                    result = calcZucheng(upNums, downNums, down);
                }
                if (down === 1) {
                    result = calcZucheng(downNums, upNums, up);
                }
                if (needMultiplyPos) {
                    return combination(this.rxPosValues.length, r) * result;
                }
                return result;
            }
            if (this.mathConfig['type'] === 'hezhi') {
                const { size, nums, needMultiplyPos } = this.mathConfig;
                const result = (this.selectedNums[0] || []).reduce((p, q) => p + calcHzCount(Number(q), size, nums), 0);
                if (needMultiplyPos) {
                    return combination(this.rxPosValues.length, size) * result;
                }
                return result;
            }
            if (this.mathConfig['type'] === 'zuxhezhi') {
                const { size, nums, needMultiplyPos } = this.mathConfig;
                const result = (this.selectedNums[0] || []).reduce((p, q) => p + calcZuxHzCount(Number(q), size, nums), 0);
                if (needMultiplyPos) {
                    return combination(this.rxPosValues.length, size) * result;
                }
                return result;
            }
            if (this.mathConfig['type'] === 'kuadu') {
                const { size, nums } = this.mathConfig;
                return (this.selectedNums[0] || []).reduce((p, q) => p + calcKuaduCount(Number(q), size, nums), 0);
            }
            if (this.mathConfig['type'] === 'baodan') {
                const { n } = this.mathConfig;
                if (this.selectedNums[0] && this.selectedNums[0].length > 0) {
                    return n;
                }
                return 0;
            }
            if (this.mathConfig['type'] === 'rzxfs') {
                const { r } = this.mathConfig;
                const wan = this.selectedNums[0] ? this.selectedNums[0].length : 0;
                const qian = this.selectedNums[1] ? this.selectedNums[1].length : 0;
                const bai = this.selectedNums[2] ? this.selectedNums[2].length : 0;
                const shi = this.selectedNums[3] ? this.selectedNums[3].length : 0;
                const ge = this.selectedNums[4] ? this.selectedNums[4].length : 0;
                if (r === 2) {//任选2
                    return wan * (qian + bai + shi + ge) + qian * (bai + shi + ge) + bai * (shi + ge) + shi * ge;
                }

                if (r === 3) {//任选3
                    return (wan * qian + wan * bai + qian * bai) * (shi + ge) + wan * qian * bai + (wan + qian + bai) * shi * ge;
                }

                if (r === 4) {
                    return wan * qian * bai * shi + wan * qian * bai * ge + wan * qian * shi * ge + wan * bai * shi * ge + qian * bai * shi * ge;
                }
            }
            if (this.mathConfig['type'] === '11x5zxfs') {
                const { posCount } = this.mathConfig;
                const keys = Object.keys(this.selectedNums);
                let values = Object.values(this.selectedNums);
                values = values.map(a => a.slice());//mobx数组转js数组
                if (keys.length < posCount) {//位置没选满，为0
                    return 0;
                } else {
                    return noRepeatMul(values).length;
                }
            }
            if (this.mathConfig['type'] === '11x5rxdt') {
                const { z } = this.mathConfig;//8中5的8
                const keys = Object.keys(this.selectedNums);
                if (keys.length < 2) {
                    return 0;
                }
                const values = Object.values(this.selectedNums);
                //计算注数
                if (values[1].length > 1 && values[0].length > 0 && (values[0].length + values[1].length) > z) {
                    return choose(values[1], z - values[0].length).length;
                } else {
                    return 0; //拖码至少要选2位，胆码至少1位，且拖码和胆码的位数和大于玩法要求个数才能计算注数
                }
            }
            return 0;
        }
        if (this.plateType === 'input') {
            const { r, needMultiplyPos } = this.mathConfig;
            if (needMultiplyPos) {//任选玩法单式需要成语位置
                return combination(this.rxPosValues.length, r) * this.inputedNums.length;
            }
            return this.inputedNums.length;
        }
        return 0;
    }

    defaultBetPiece = 1

    @observable betPiece = 1

    @action changePiece = (value) => {
        this.betPiece = Number(value);
    }

    defaultBetMode = 2

    @observable betMode = 2

    @action changeMode = (value) => {
        this.betMode = Number(value);
    }

    @computed get betMoney() {
        return Number((this.betCount * this.betMode * this.betPiece).toFixed(2));
    }

    @observable inputedNums = []

    @action uploadFile = (numOfEach, event) => {
        const reg = /['\r\n','\n','\r','\t','\v','\D','\f','\s+','　','；','，',';',',']/;
        const file = event.nativeEvent.target.files[0];
        const fileReader = new FileReader();
        fileReader.onload = () => {
            const result = fileReader.result.split(reg).filter(v => v !== '');

            if (result.some(value => {
                if (this.lotteryType === '11x5' || this.lotteryType === 'pk10' || this.lotteryType === 'kl12') {//这个选号有两位数
                    const valueArr = value.replace(/(\d)(?=(\d{2})+$)/g, '$1,').split(',');
                    if (valueArr.length !== numOfEach) {
                        return true;
                    }
                    //选号不能重复
                    if ([...new Set(valueArr)].length < numOfEach) {
                        return true;
                    }
                    const maxConfig = {
                        '11x5': 11,
                        'pk10': 10,
                        'kl12': 12
                    }
                    const minConfig = {
                        '11x5': 1,
                        'pk10': 1,
                        'kl12': 1
                    }
                    //不能超过最大值最小值
                    if (valueArr.some(v => Number(v) > maxConfig[this.lotteryType] || Number(v) < minConfig[this.lotteryType])) {
                        return true;
                    }
                } else {
                    if (value.length !== numOfEach) {
                        return true;
                    }
                }
            })) {
                return;
            }


            this.inputedNums = result;
        };
        fileReader.readAsText(file);
    }

    @action deleteInputItem = (index) => {
        this.inputedNums.splice(index, 1);
        this.inputedNums = [...this.inputedNums];
    }

    @action clearInputNums = () => {
        this.inputedNums = [];
    }

    @action inputNum = (numOfEach, event) => {
        const value = event.target.value;
        if (!/^\d+$/.test(value)) {
            return;
        }

        if (this.lotteryType === '11x5' || this.lotteryType === 'pk10' || this.lotteryType === 'kl12') {//这个选号有两位数
            const valueArr = value.replace(/(\d)(?=(\d{2})+$)/g, '$1,').split(',');
            if (valueArr.length !== numOfEach) {
                return;
            }
            //选号不能重复
            if ([...new Set(valueArr)].length < numOfEach) {
                return;
            }
            const maxConfig = {
                '11x5': 11,
                'pk10': 10,
                'kl12': 12
            }
            const minConfig = {
                '11x5': 1,
                'pk10': 1,
                'kl12': 1
            }
            //不能超过最大值最小值
            if (valueArr.some(v => Number(v) > maxConfig[this.lotteryType] || Number(v) < minConfig[this.lotteryType])) {
                return;
            }
        } else {
            if (value.length !== numOfEach) {
                return;
            }
        }
        this.inputedNums.push(value);
        this.inputedNums = [...this.inputedNums];
        event.target.value = '';
    }

    @action genOrderData = () => {
        const { name } = this.plateConfig[this.lotteryCode][this.method];
        let result = [];
        if (this.plateType === 'input') {
            result = [{
                key: '1',
                detail: {
                    name,
                    rxPos: this.rxPosValues ? this.rxPosValues.toString() : '',
                    betContent: this.inputedNums.toString(),
                    playWay: this.method,
                    odds: this.currentOdd.split('~')[0],
                    point: this.currentOdd.split('~')[1],
                },
                piece: this.betPiece,
                price: this.betMode,
                amount: { betMoney: this.betMoney, betCount: this.betCount },
                win: '1',
            }];
            return result;
        }
        if (this.chaidanConfig.chaidan) {
            const len = this.selectedChaidanNums.length;
            result = this.selectedChaidanNums.map((item, index) => {
                const { en, cn } = item;
                return {
                    key: index,
                    detail: {
                        name,
                        rxPos: this.rxPosValues ? this.rxPosValues.toString() : '',
                        betContent: cn,
                        playWay: en,
                        odds: this.oddsData[en]['bonusA'],
                        point: this.oddsData[en]['rateA'],
                    },
                    piece: this.betPiece,
                    price: this.betMode,
                    amount: { betMoney: this.betMoney / len, betCount: 1 },
                    win: '1',
                }
            });
            return result;
        }
        const { pos } = this.plateConfig[this.lotteryCode][this.method]['plate'];
        const arr = [];
        //转成想要的格式，如123,,1,1,
        for (let i = 0; i < pos.length; i++) {
            if (this.selectedNums[i]) {
                arr.push(this.selectedNums[i].join(''));
            } else {
                arr.push('');
            }
        }
        result = [{
            key: '1',
            detail: {
                name,
                rxPos: this.rxPosValues ? this.rxPosValues.toString() : '',
                betContent: arr.toString(),
                playWay: this.method,
                odds: this.currentOdd.split('~')[0],
                point: this.currentOdd.split('~')[1],
            },
            piece: this.betPiece,
            price: this.betMode,
            amount: { betMoney: this.betMoney, betCount: this.betCount },
            win: '1',
        }];
        return result;
    }

    @action addOrder = () => {//添加订单
        const result = this.genOrderData();
        this.orderData = [...this.orderData, ...result];
        if (this.plateType === 'input') {
            this.inputedNums = [];
            return;
        }
        if (this.chaidanConfig.chaidan) {
            this.selectedChaidanNums = [];
            return;
        }
        this.selectedNums = {};
        this.showTraceFlag = false;
        this.setTraceSelectedRowKeys([]);
    }

    @action changeOrderItemPiece = (orderItemObj, piece) => {
        orderItemObj.piece = piece;
        this.orderData = [...this.orderData];
    }

    @action changeOrderItemMode = (orderItemObj, mode) => {
        orderItemObj.price = mode;
        this.orderData = [...this.orderData];
    }

    //order订单栏部分
    @observable betModalShowed = false

    @observable printOrderFlag = Boolean(localStorage.getItem('printOrderFlag')) || false

    @observable orderData = []

    @action
    toggleBetModal = (bool) => {
        this.betModalShowed = bool;
    }

    @action
    setPrintOrderFlag = (bool) => {
        this.printOrderFlag = bool;
        if (bool) {
            localStorage.setItem('printOrderFlag', 1);
        } else {
            localStorage.removeItem('printOrderFlag');
        }
    }

    @computed get orderTotalMoney() {
        return this.orderData.reduce((a, b) => a + b.amount.betCount * b.piece * b.price, 0);
    }

    @computed get orderTotalCount() {
        return this.orderData.reduce((a, b) => a + b.amount.betCount, 0);
    }

    @action
    submitOrder = async () => {
        let orderObj = {
            lottery: this.lotteryCode.toLocaleUpperCase(),
            issue: this.currentIssue,
            order: JSON.stringify(this.orderData.map(order => ({
                method: order.detail.playWay,
                code: order.detail.betContent,
                nums: order.amount.betCount,
                amount: order.amount.betMoney,
                piece: order.piece,
                price: order.price,
                odds: order.detail.odds,
                point: order.detail.point,
            }))),
            betType: 2,
            sourceType: 0
        };
        if (this.showTraceFlag) {//追号
            const counts = {};
            for (let item of this.traceData) {
                const issueDetail = item['issue']['detail'];
                if (item.piece > 0 && this.traceSelectedRowKeys.includes(issueDetail)) {
                    counts[issueDetail] = item.piece;
                }
            }
            orderObj = {
                ...orderObj,
                istrace: true,
                betType: 4,
                trace: JSON.stringify({
                    counts,
                    start: this.nextApp[0]['issue'],
                    totalMoney: this.totalTraceMoney,
                    totalCount: this.totalTraceCount,
                    mode: this.activeTraceType || this.defaultActiveTraceType,
                    winStop: this.winStopFlag,
                })
            };
        }
        const res = await submitOrder(orderObj);
        if (res.data.code === 1) {
            this.orderData = [];
        }
        return res;
    }

    @action quickSubmitOrder = async () => {
        const orderData = this.genOrderData();
        const res = await submitOrder({
            lottery: this.lotteryCode.toLocaleUpperCase(),
            issue: this.currentIssue,
            order: JSON.stringify(orderData.map(order => ({
                method: order.detail.playWay,
                code: order.detail.betContent,
                nums: order.amount.betCount,
                amount: order.amount.betMoney,
                piece: order.piece,
                price: order.price,
                odds: 1,
                point: 0,
            }))),
            betType: 2,
            sourceType: 0
        });
        if (res.data.code === 1) {
            if (this.plateType === 'input') {
                this.inputedNums = [];
                return;
            }
            if (this.chaidanConfig.chaidan) {
                this.selectedChaidanNums = [];
                return;
            }
            this.selectedNums = {};
        }
        return res;
    }

    @action
    deleteAllItem = () => {
        this.orderData = [];
        this.showTraceFlag = false;//收起追号盘
    }

    @action
    deleteOrderItem = (key) => {
        const _index = this.orderData.findIndex(v => v.key === key);
        this.orderData.splice(_index, 1);
        if (this.orderData.length === 0) {
            this.showTraceFlag = false;//收起追号盘
        }
        this.orderData = [...this.orderData];
    }

    @observable recordData = []

    @action
    getRecord = async () => {//获取投注记录
        const res = await getRecord({
            lottery: this.lotteryCode.toLocaleUpperCase()
        });
        if (res.data.code === 1) {
            this.recordData = res.data.result;
        }
    }
    //追号部分
    defaultStartPiece = '1'

    defaultTraceGap = '2'

    defaultTracePiece = '2'

    defaultTraceCount = '5'

    defaultTraceMinRate = '1'

    @observable startPiece = null

    @action
    changeStartPiece = value => {
        this.startPiece = value;
    }

    @observable traceGap = null

    @action
    changeTraceGap = value => {
        this.traceGap = value;
    }

    @observable tracePiece = null

    @action
    changeTracePiece = value => {
        this.tracePiece = value;
    }

    @observable traceCount = null

    @action
    changeTraceCount = value => {
        this.traceCount = value;
    }

    @observable traceMinRate = null

    @action
    changeTraceMinRate = value => {
        this.traceMinRate = value;
    }

    @observable nextApp = []

    defaultActiveTraceType = '3'

    @observable activeTraceType = '3'

    @action
    setActiveTraceType = value => {
        this.activeTraceType = value;
        this.initTraceData();
        this.setTraceSelectedRowKeys([]);
    }

    traceConfig = {
        1: '利润率追号',
        2: '同倍追号',
        3: '翻倍追号'
    }

    @observable traceData = []

    @action genTraceClickCb = () => {
        this.initTraceData();
        this.setTraceSelectedRowKeys(this.traceData.slice(0, Number(this.traceCount || this.defaultTraceCount)).map(v => v.issue.detail));
        this.genTraceData();
    }

    @action genTraceData = () => {
        let sumAmount = 0;
        const timeStart = Number(this.startPiece || this.defaultStartPiece);//起始倍数
        const gap = Number(this.traceGap || this.defaultTraceGap);//隔期
        const tracePiece = Number(this.tracePiece || this.defaultTracePiece);//倍x
        let piece;
        for (let i = 0; i < this.traceData.length; i++) {
            const issueDetail = this.traceData[i]['issue']['detail'];
            if (this.traceSelectedRowKeys.includes(issueDetail)) {
                if (this.activeTraceType === '3') {
                    piece = timeStart * Math.pow(tracePiece, Math.floor(i / gap));
                }
                if (this.activeTraceType === '2') {
                    piece = timeStart;
                }
                if (this.activeTraceType === '1') {
                    const oldAmount = sumAmount;
                    piece = computeByMargin(this.startPiece || this.defaultStartPiece, this.traceMinRate || this.defaultTraceMinRate, this.orderTotalMoney, sumAmount, this.odds || 1);
                    piece = piece > 99999 ? 99999 : piece;
                    if (piece < 1) {
                        sumAmount = i * this.orderTotalMoney;
                    } else {
                        sumAmount = piece * this.orderTotalMoney + oldAmount;
                    }
                }
                this.traceData[i]['piece'] = piece;
                this.traceData[i]['money'] = (piece * this.orderTotalMoney).toFixed(2);
            } else {
                this.traceData[i]['piece'] = 0;
                this.traceData[i]['money'] = '0.00';
            }
        }
        this.traceData = [...this.traceData];
    }

    @action initTraceData = () => {
        /* 
            全部默认为0，点击每个item 的时候生成
        */
        if (this.nextApp.length > 0) {
            const todayTrace = this.nextApp[0];
            const tomorrowTrace = this.nextApp[1];//隔天期
            const todayTotal = todayTrace.total;
            const genData = (start, obj, isTomorrow) => {
                if (!obj) return [];
                const { total, issue, sellStart, durationTime } = obj;
                const result = [];
                const issueArr = issue.split('-');
                const _issue = issueArr.pop();
                const _issueLength = _issue.length;
                const startIssue = Number(_issue);//'001' => 1
                for (let i = start; i < total; i++) {
                    const duduceLen = _issueLength - String(startIssue).length;
                    const _startIssue = Array(duduceLen).fill('0').join('') + (startIssue + i);//2 => '002'
                    let issueDetail;
                    if (issueArr.length > 0) {
                        issueDetail = issueArr.join('-') + '-' + _startIssue;
                    } else {
                        issueDetail = _startIssue;
                    }
                    result.push({
                        piece: 0,
                        money: '0.00',
                        key: issueDetail,
                        index: `${i + 1}.`,
                        issue: {
                            isTomorrow,
                            detail: issueDetail
                        },
                        date: formatTime(new Date((sellStart + durationTime) * 1000), 'YYYY-MM-DD hh:mm:ss'),
                    });
                }
                return result;
            }
            this.traceData = genData(0, todayTrace, false).concat(genData(todayTotal, tomorrowTrace, true));
        }
    }

    @action setTraceSelectedRowKeys = (value) => {
        this.traceSelectedRowKeys = value;
    }

    @observable showTraceFlag = false

    @observable traceSelectedRowKeys = []

    @computed get rateTraceFlag() {
        return this.orderData.length !== 1;
    }

    @action
    toggleTracePanl = (bool) => {
        this.showTraceFlag = bool;
        if (bool) {
            this.initTraceData();
        }
        if (!bool) {
            this.setTraceSelectedRowKeys([]);
        }
        this.setTrendListHeight();
    }

    @action changeTraceItemPiece = (record, value) => {
        record.piece = value;
        record.money = Number(record.piece * this.orderTotalMoney).toFixed(2);
        this.traceData = [...this.traceData];
    }

    @observable mainLeftRef = null

    @action
    setMainLeftRef = ref => {
        this.mainLeftRef = ref;
    }

    @observable trendListHeight = 800

    @action
    setTrendListHeight = async () => {
        await timeSleep(500);
        this.trendListHeight = this.mainLeftRef.offsetHeight;
    }

    @computed get totalTraceCount() {
        return this.traceSelectedRowKeys.length;
    }

    @computed get totalTraceMoney() {
        let result = 0;
        for (let item of this.traceData) {
            if (this.traceSelectedRowKeys.includes(item.issue.detail) && item.money > 0) {
                result += Number(item.money);
            }
        }
        return result.toFixed(2);
    }

    @observable winStopFlag = false

    @action toggleTraceWinStop = bool => {
        this.winStopFlag = bool;
    }

    @observable traceModalFlag = false

    @action switchTraceModal = bool => {
        this.traceModalFlag = bool;
    }

    @observable mmcWinStopFlag = false

    @action
    toggleMmcWinStop = bool => {
        this.mmcWinStopFlag = bool;
    }

    @observable continuousCount = '5';

    @action
    setContinuousCount = value => {
        this.continuousCount = value;
    }

    @observable mmcModalFlag = false;

    @action toggleMmcModal = bool => {
        this.mmcModalFlag = bool;
    }
}

export default new LotteryStore();